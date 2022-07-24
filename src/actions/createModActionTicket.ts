import Discord, { MessageActionRow, MessageButton } from 'discord.js';
import EmojiEmbed from '../utils/generateEmojiEmbed.js';
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";

export async function create(guild: Discord.Guild, member: Discord.User, createdBy: Discord.User, reason: string) {
    let config = await client.database.guilds.read(guild.id);
    // @ts-ignore
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger
    let overwrites = [{
        id: member,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"],
        type: "member"
    }] as Discord.OverwriteResolvable[];
    overwrites.push({
        id: guild.roles.everyone,
        deny: ["VIEW_CHANNEL"],
        type: "role"
    })
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
        await c.send({ embeds: [new EmojiEmbed()
            .setTitle("New Ticket")
            .setDescription(
                `Ticket created by a Moderator\n` +
                `**Support type:** Appeal submission\n` + (reason != null ? `**Reason:**\n> ${reason}\n` : "") +
                `**Ticket ID:** \`${c.id}\`\n` +
                `Type \`/ticket close\` to close this ticket.`,
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        ], components: [new MessageActionRow().addComponents([new MessageButton()
            .setLabel("Close")
            .setStyle("DANGER")
            .setCustomId("closeticket")
            .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
        ])]})
        let data = {
            meta:{
                type: 'ticketCreate',
                displayName: 'Ticket Created',
                calculateType: "ticketUpdate",
                color: NucleusColors.green,
                emoji: 'GUILD.TICKET.OPEN',
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(member.id, renderUser(member)),
                createdBy: entry(createdBy.id, renderUser(createdBy)),
                created: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketChannel: entry(c.id, renderChannel(c)),
            },
            hidden: {
                guild: guild.id
            }
        }
        log(data);
    } catch (e) { console.log(e); return null }
    return c.id
}

export async function areTicketsEnabled(guild: string) {
    let config = await client.database.guilds.read(guild);
    return config.tickets.enabled;
}