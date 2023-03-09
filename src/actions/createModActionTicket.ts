import { getCommandMentionByName } from "./../utils/getCommandDataByName.js";
import Discord, { ActionRowBuilder, ButtonBuilder, OverwriteType, ChannelType, ButtonStyle } from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";

export async function create(
    guild: Discord.Guild,
    user: Discord.User,
    createdBy: Discord.User,
    reason: string | null,
    customReason?: string
) {
    const config = await client.database.guilds.read(guild.id);
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger;
    const overwrites = [
        {
            id: user,
            allow: ["ViewChannel", "SendMessages", "AttachFiles", "AddReactions", "ReadMessageHistory"],
            type: OverwriteType.Member
        }
    ] as unknown as Discord.OverwriteResolvable[];
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
    const targetChannel: Discord.CategoryChannel | Discord.TextChannel = (await guild.channels.fetch(
        config.tickets.category!
    ))! as Discord.CategoryChannel | Discord.TextChannel;

    let c: Discord.TextChannel | Discord.PrivateThreadChannel;
    if (targetChannel.type === Discord.ChannelType.GuildCategory) {
        const overwrites = [
            {
                id: user,
                allow: ["ViewChannel", "SendMessages", "AttachFiles", "AddReactions", "ReadMessageHistory"],
                type: Discord.OverwriteType.Member
            }
        ] as Discord.OverwriteResolvable[];
        overwrites.push({
            id: guild.roles.everyone,
            deny: ["ViewChannel"],
            type: Discord.OverwriteType.Role
        });
        if (config.tickets.supportRole !== null) {
            overwrites.push({
                id: guild.roles.cache.get(config.tickets.supportRole)!,
                allow: ["ViewChannel", "SendMessages", "AttachFiles", "AddReactions", "ReadMessageHistory"],
                type: Discord.OverwriteType.Role
            });
        }

        try {
            c = await guild.channels.create({
                name: `${user.username.toLowerCase()}`,
                type: ChannelType.GuildText,
                topic: `${user.id} Active`,
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
                    `<@${user.id}>` +
                    (config.tickets.supportRole !== null ? ` • <@&${config.tickets.supportRole}>` : ""),
                allowedMentions: {
                    users: [user.id],
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
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setLabel("Close")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId("closeticket")
                            .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    ])
                ]
            });
        } catch (e) {
            return null;
        }
    } else {
        c = (await targetChannel.threads.create({
            name: `${user.username} - ${user.id} - Active`,
            autoArchiveDuration: 60 * 24 * 7,
            type: Discord.ChannelType.PrivateThread,
            reason: "Creating ticket"
        })) as Discord.PrivateThreadChannel;
        await c.members.add(user.id);
        await c.members.add(createdBy.id);
        try {
            await c.send({
                content:
                    `<@${user.id}>` +
                    (config.tickets.supportRole !== null ? ` • <@&${config.tickets.supportRole}>` : ""),
                allowedMentions: {
                    users: [user.id],
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
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setLabel("Close")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId("closeticket")
                            .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    ])
                ]
            });
        } catch (e) {
            return null;
        }
    }
    const data = {
        meta: {
            type: "ticketCreate",
            displayName: "Ticket Created",
            calculateType: "ticketUpdate",
            color: NucleusColors.green,
            emoji: "GUILD.TICKET.OPEN",
            timestamp: Date.now()
        },
        list: {
            ticketFor: entry(user.id, renderUser(user)),
            createdBy: entry(createdBy.id, renderUser(createdBy)),
            created: entry(Date.now().toString(), renderDelta(Date.now())),
            ticketChannel: entry(c.id, renderChannel(c))
        },
        hidden: {
            guild: guild.id
        }
    };
    await log(data);
    return c.id;
}

export async function areTicketsEnabled(guild: string) {
    const config = await client.database.guilds.read(guild);
    return config.tickets.enabled;
}
