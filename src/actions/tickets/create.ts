import Discord, { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ButtonInteraction } from "discord.js";
import { tickets, toHexArray } from "../../utils/calculate.js";
import client from "../../utils/client.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { getCommandMentionByName } from "../../utils/getCommandDataByName.js";

function capitalize(s: string) {
    s = s.replace(/([A-Z])/g, " $1");
    return s.length < 3 ? s.toUpperCase() : s[0]!.toUpperCase() + s.slice(1).toLowerCase();
}

export default async function (interaction: CommandInteraction | ButtonInteraction) {
    if (!interaction.guild) return;
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger;
    const config = await client.database.guilds.read(interaction.guild.id);
    if (!config.tickets.enabled || !config.tickets.category) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tickets are disabled")
                    .setDescription("Please enable tickets in the configuration to use this command.")
                    .setFooter({
                        text: (interaction.member!.permissions as Discord.PermissionsBitField).has("ManageGuild")
                            ? "You can enable it by running /settings tickets"
                            : ""
                    })
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ],
            ephemeral: true
        });
    }
    let count = 0;
    const targetChannel: Discord.CategoryChannel | Discord.TextChannel = (await interaction.guild.channels.fetch(config.tickets.category))! as Discord.CategoryChannel | Discord.TextChannel;
    if (targetChannel.type === Discord.ChannelType.GuildCategory) {
        // For channels, the topic is the user ID, then the word Active
        const category = targetChannel as Discord.CategoryChannel;
        category.children.cache.forEach((element) => {
            if (!(element.type === Discord.ChannelType.GuildText)) return;
            if (((element as Discord.TextChannel).topic ?? "").includes(`${interaction.member!.user.id}`)) {
                if (((element as Discord.TextChannel).topic ?? "").endsWith("Active")) { count++; }
            }
        });
    } else {
        // For threads, the name is the users name, id, then the word Active
        const channel = targetChannel as Discord.TextChannel;
        channel.threads.cache.forEach((element: Discord.ThreadChannel) => {
            if (element.name.includes(`${interaction.member!.user.id}`)) {
                if (element.name.endsWith("Active")) { count++; }
            }
        });
    }
    if (count >= config.tickets.maxTickets) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Create Ticket")
                    .setDescription(
                        `You have reached the maximum amount of tickets (${config.tickets.maxTickets}). Please close one of your active tickets before creating a new one.`
                    )
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ],
            ephemeral: true
        });
    }
    let ticketTypes: string[];
    let custom = false;
    if (config.tickets.customTypes && config.tickets.useCustom) {
        ticketTypes = config.tickets.customTypes;
        custom = true;
    } else if (config.tickets.types) ticketTypes = toHexArray(config.tickets.types, tickets);
    else ticketTypes = [];
    let chosenType: string | null;
    let splitFormattedTicketTypes: ActionRowBuilder<ButtonBuilder>[] = [];
    if (ticketTypes.length > 0) {
        let formattedTicketTypes = [];
        formattedTicketTypes = ticketTypes.map((type) => {
            if (custom) {
                return new ButtonBuilder().setLabel(type).setStyle(ButtonStyle.Primary).setCustomId(type);
            } else {
                return new ButtonBuilder()
                    .setLabel(capitalize(type))
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(type)
                    .setEmoji(getEmojiByName("TICKETS." + type.toString().toUpperCase(), "id"));
            }
        });
        for (let i = 0; i < formattedTicketTypes.length; i += 5) {
            splitFormattedTicketTypes.push(new ActionRowBuilder<ButtonBuilder>().addComponents(formattedTicketTypes.slice(i, i + 5)));
        }
        const m = await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Create Ticket")
                    .setDescription("Select a ticket type")
                    .setStatus("Success")
                    .setEmoji("GUILD.TICKET.OPEN")
            ],
            ephemeral: true,
            fetchReply: true,
            components: splitFormattedTicketTypes
        });
        let component;
        try {
            component = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.message.id === m.id }
            });
        } catch (e) {
            return;
        }
        chosenType = component.customId;
        splitFormattedTicketTypes = [];
        formattedTicketTypes = [];
        formattedTicketTypes = ticketTypes.map((type) => {
            if (custom) {
                return new ButtonBuilder()
                    .setLabel(type)
                    .setStyle(chosenType === type ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setCustomId(type)
                    .setDisabled(true);
            } else {
                return new ButtonBuilder()
                    .setLabel(capitalize(type))
                    .setStyle(chosenType === type ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setCustomId(type)
                    .setEmoji(getEmojiByName("TICKETS." + type.toString().toUpperCase(), "id"))
                    .setDisabled(true);
            }
        });
        for (let i = 0; i < formattedTicketTypes.length; i += 5) {
            splitFormattedTicketTypes.push(new ActionRowBuilder<ButtonBuilder>().addComponents(formattedTicketTypes.slice(i, i + 5)));
        }
        component.update({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Create Ticket")
                    .setDescription("Select a ticket type")
                    .setStatus("Success")
                    .setEmoji("GUILD.TICKET.OPEN")
            ],
            components: splitFormattedTicketTypes
        });
    } else {
        chosenType = null;
        await interaction.reply({
            embeds: [new EmojiEmbed().setTitle("Create Ticket").setEmoji("GUILD.TICKET.OPEN")],
            ephemeral: true,
            components: splitFormattedTicketTypes
        });
    }
    let c: Discord.TextChannel | Discord.PrivateThreadChannel;
    if (targetChannel.type === Discord.ChannelType.GuildCategory) {
        const overwrites = [
            {
                id: interaction.member,
                allow: ["ViewChannel", "SendMessages", "AttachFiles", "AddReactions", "ReadMessageHistory"],
                type: Discord.OverwriteType.Member
            }
        ] as Discord.OverwriteResolvable[];
        overwrites.push({
            id: interaction.guild.roles.everyone,
            deny: ["ViewChannel"],
            type: Discord.OverwriteType.Role
        });
        if (config.tickets.supportRole !== null) {
            overwrites.push({
                id: interaction.guild.roles.cache.get(config.tickets.supportRole)!,
                allow: ["ViewChannel", "SendMessages", "AttachFiles", "AddReactions", "ReadMessageHistory"],
                type: Discord.OverwriteType.Role
            });
        }

        try {
            c = await interaction.guild.channels.create({
                name: `${interaction.member!.user.username.toLowerCase()}`,
                type: Discord.ChannelType.GuildText,
                topic: `${interaction.member!.user.id} Active`,
                parent: config.tickets.category,
                nsfw: false,
                permissionOverwrites: overwrites as Discord.OverwriteResolvable[],
                reason: "Creating ticket"
            });
        } catch (e) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Create Ticket")
                        .setDescription("Failed to create ticket")
                        .setStatus("Danger")
                        .setEmoji("CONTROL.BLOCKCROSS")
                ]
            });
        }
        try {
            await c.send({
                content:
                    `<@${interaction.member!.user.id}>` +
                    (config.tickets.supportRole !== null ? ` • <@&${config.tickets.supportRole}>` : ""),
                allowedMentions: {
                    users: [(interaction.member as Discord.GuildMember).id],
                    roles: config.tickets.supportRole !== null ? [config.tickets.supportRole] : []
                }
            });
            let content: string | null = null;
            if (interaction.isCommand()) {
                content = interaction.options.get("message")?.value as string;
            }
            if (content) content = `**Message:**\n> ${content}\n`;
            let emoji;
            if (chosenType) {
                emoji = custom ? "" : getEmojiByName("TICKETS." + chosenType.toUpperCase());
            } else {
                emoji = "";
            }
            await c.send({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("New Ticket")
                        .setDescription(
                            `Ticket created by <@${interaction.member!.user.id}>\n` +
                                `**Support type:** ${
                                    chosenType !== null ? emoji + " " + capitalize(chosenType) : "General"
                                }\n` +
                                `**Ticket ID:** \`${c.id}\`\n${content ?? ""}\n` +
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
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Create Ticket")
                        .setDescription("Failed to create ticket")
                        .setStatus("Danger")
                        .setEmoji("GUILD.TICKET.CLOSE")
                ]
            });
        }
    } else {
        c = await targetChannel.threads.create({name: `${interaction.member!.user.username} - ${interaction.member!.user.id} - Active`,
                                                autoArchiveDuration: 60 * 24 * 7,
                                                type: Discord.ChannelType.PrivateThread,
                                                reason: "Creating ticket"
                                                }) as Discord.PrivateThreadChannel;
        c.members.add(interaction.member!.user.id);
        try {
            await c.send({
                content:
                    `<@${interaction.member!.user.id}>` +
                    (config.tickets.supportRole !== null ? ` • <@&${config.tickets.supportRole}>` : ""),
                allowedMentions: {
                    users: [(interaction.member as Discord.GuildMember).id],
                    roles: config.tickets.supportRole !== null ? [config.tickets.supportRole] : []
                }
            });
            let content: string | null = null;
            if (interaction.isCommand()) {
                content = interaction.options.get("message")?.value as string;
            }
            if (content) content = `**Message:**\n> ${content}\n`;
            let emoji;
            if (chosenType) {
                emoji = custom ? "" : getEmojiByName("TICKETS." + chosenType.toUpperCase());
            } else {
                emoji = "";
            }
            await c.send({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("New Ticket")
                        .setDescription(
                            `Ticket created by <@${interaction.member!.user.id}>\n` +
                                `**Support type:** ${
                                    chosenType !== null ? emoji + " " + capitalize(chosenType) : "General"
                                }\n` +
                                `**Ticket ID:** \`${c.id}\`\n${content ?? ""}\n` +
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
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Create Ticket")
                        .setDescription("Failed to create ticket")
                        .setStatus("Danger")
                        .setEmoji("GUILD.TICKET.CLOSE")
                ]
            });
        }
    }
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
            ticketFor: entry(interaction.member!.user.id, renderUser(interaction.member!.user! as Discord.User)),
            created: entry(new Date().getTime(), renderDelta(new Date().getTime())),
            ticketChannel: entry(c.id, renderChannel(c))
        },
        hidden: {
            guild: interaction.guild.id
        }
    };
    log(data);
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Create Ticket")
                .setDescription(`Ticket created. You can view it here: <#${c.id}>`)
                .setStatus("Success")
                .setEmoji("GUILD.TICKET.OPEN")
        ],
        components: splitFormattedTicketTypes
    });
}
