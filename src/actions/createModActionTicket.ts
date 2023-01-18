import { getCommandMentionByName } from './../utils/getCommandMentionByName.js';
import Discord, { ActionRowBuilder, ButtonBuilder, OverwriteType, ChannelType, ButtonStyle } from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";

export async function create(
    guild: Discord.Guild,
    member: Discord.User,
    createdBy: Discord.User,
    reason: string | null,
    customReason?: string
) {
    const config = await client.database.guilds.read(guild.id);
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger;
    const overwrites = [{
        id: member,
        allow: ["ViewChannel", "SendMessages", "AttachFiles", "AddReactions", "ReadMessageHistory"],
        type: OverwriteType.Member
    }] as unknown as Discord.OverwriteResolvable[];
    overwrites.push({
        id: guild.roles.everyone,
        deny: ["ViewChannel"],
        type: OverwriteType.Role
    });
    if (config.tickets.supportRole !== null) {
        overwrites.push({
            id: guild.roles.cache.get(config.tickets.supportRole)!,
            allow: ["ViewChannel", "SendMessages", "AttachFiles", "AddReactions", "ReadMessageHistory"],
            type: OverwriteType.Role
        });
    }

    let c;
    try {
        c = await guild.channels.create({
            name: member.username,
            type: ChannelType.GuildText,
            topic: `${member.id} Active`,
            parent: config.tickets.category,
            nsfw: false,
            permissionOverwrites: overwrites as Discord.OverwriteResolvable[],
            reason: "Creating ticket"
        });
    } catch (e) {
        return null;
    }
    try {
        await c.send({
            content:
                `<@${member.id}>` + (config.tickets.supportRole !== null ? ` • <@&${config.tickets.supportRole}>` : ""),
            allowedMentions: {
                users: [member.id],
                roles: config.tickets.supportRole !== null ? [config.tickets.supportRole] : []
            }
        });
        await c.send({
            embeds: [
                new EmojiEmbed()
                    .setTitle("New Ticket")
                    .setDescription(
                        "Ticket created by a Moderator\n" +
                            `**Support type:** ${customReason ? customReason : "Appeal submission"}\n` +
                            (reason !== null ? `**Reason:**\n> ${reason}\n` : "") +
                            `**Ticket ID:** \`${c.id}\`\n` +
                            `Type ${getCommandMentionByName("ticket/close")} to close this ticket.`
                    )
                    .setStatus("Success")
                    .setEmoji("GUILD.TICKET.OPEN")
            ],
            components: [
                new ActionRowBuilder<Discord.ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel("Close")
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId("closeticket")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                ])
            ]
        });
        const data = {
            meta: {
                type: "ticketCreate",
                displayName: "Ticket Created",
                calculateType: "ticketUpdate",
                color: NucleusColors.green,
                emoji: "GUILD.TICKET.OPEN",
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(member.id, renderUser(member)),
                createdBy: entry(createdBy.id, renderUser(createdBy)),
                created: entry((new Date().getTime()).toString(), renderDelta(new Date().getTime())),
                ticketChannel: entry(c.id, renderChannel(c))
            },
            hidden: {
                guild: guild.id
            }
        };
        log(data);
    } catch (e) {
        console.log(e);
        return null;
    }
    return c.id;
}

export async function areTicketsEnabled(guild: string) {
    const config = await client.database.guilds.read(guild);
    return config.tickets.enabled;
}
