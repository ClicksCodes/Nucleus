import Discord from 'discord.js';
import readConfig from '../utils/readConfig.js'
import generateEmojiEmbed from '../utils/generateEmojiEmbed.js'

export async function create(guild: Discord.Guild, member: Discord.User, client) {
    let config = await readConfig(guild.id);
    // @ts-ignore
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger
    let overwrites = [{
        id: member,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"],
        type: "member"
    }] as Discord.OverwriteResolvable[];
    if (config.tickets.supportRole != null) {
        overwrites.push({
            id: guild.roles.cache.get(config.tickets.supportRole),
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"],
            type: "role"
        })
    }

    let c;
    try {
        c = await guild.channels.create(member.username, {
            type: "GUILD_TEXT",
            topic: `${member.id} Active`,
            parent: config.tickets.category,
            nsfw: false,
            permissionOverwrites: (overwrites as Discord.OverwriteResolvable[]),
            reason: "Creating ticket"
        })
    } catch (e) {
        return null
    }
    try {
        await c.send(
            {
                content: (`<@${member.id}>` + (config.tickets.supportRole != null ? ` • <@&${config.tickets.supportRole}>` : "")),
                allowedMentions: {
                    users: [member.id],
                    roles: (config.tickets.supportRole != null ? [config.tickets.supportRole] : [])
                }
            }
        )
        await c.send({ embeds: [new generateEmojiEmbed()
            .setTitle("New Ticket")
            .setDescription(
                `Ticket created by a Moderator\n` +
                `**Support type:** Appeal submission\n` +
                `**Ticket ID:** \`${c.id}\`\n` +
                `Type \`/ticket close\` to archive this ticket.`,
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        ]})
        let data = {
            meta:{
                type: 'ticketCreate',
                displayName: 'Ticket Created',
                calculateType: true,
                color: NucleusColors.green,
                emoji: 'GUILD.TICKET.OPEN',
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(member.id, renderUser(member)),
                created: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketChannel: entry(c.id, renderChannel(c)),
            },
            hidden: {
                guild: guild.id
            }
        }
        log(data, client);
    } catch (e) { console.log(e); return null }
    return c.id
}

export async function areTicketsEnabled(guild: string) {
    let config = await readConfig(guild);
    return config.tickets.enabled;
}