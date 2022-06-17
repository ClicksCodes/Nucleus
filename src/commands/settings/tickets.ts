import getEmojiByName from "../../utils/getEmojiByName.js";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import Discord, { CommandInteraction, MessageActionRow, MessageButton, MessageSelectMenu, TextInputComponent } from "discord.js";
import { SelectMenuOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import { ChannelType } from 'discord-api-types';
import client from "../../utils/client.js";
import { toHexInteger, toHexArray, tickets as ticketTypes } from "../../utils/calculate.js";
import { capitalize } from '../../utils/generateKeyValueList.js';
import { modalInteractionCollector } from "../../utils/dualCollector.js";

const command = (builder: SlashCommandSubcommandBuilder) => builder
    .setName("tickets")
    .setDescription("Shows settings for tickets | Use no arguments to manage custom types")
    .addStringOption(option => option.setName("enabled").setDescription("If users should be able to create tickets").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]]))
    .addChannelOption(option => option.setName("category").setDescription("The category where tickets are created").addChannelType(ChannelType.GuildCategory).setRequired(false))
    .addNumberOption(option => option.setName("maxticketsperuser").setDescription("The maximum amount of tickets a user can create | Default 5").setRequired(false).setMinValue(1))
    .addRoleOption(option => option.setName("supportrole").setDescription("This role will have view access to all tickets and will be pinged when a ticket is created").setRequired(false))

const callback = async (interaction: CommandInteraction): Promise<any> => {
    let m;
    m = await interaction.reply({
        embeds: [new generateEmojiEmbed()
            .setTitle("Loading")
            .setStatus("Danger")
            .setEmoji("NUCLEUS.LOADING")
        ], ephemeral: true, fetchReply: true
    });
    let options = {
        enabled: interaction.options.getString("enabled") as string | boolean,
        category: interaction.options.getChannel("category"),
        maxtickets: interaction.options.getNumber("maxticketsperuser"),
        supportping: interaction.options.getRole("supportrole")
    }
    if (options.enabled !== null || options.category || options.maxtickets || options.supportping) {
        options.enabled = options.enabled === "yes" ? true : false;
        if (options.category) {
            let channel
            try {
                channel = interaction.guild.channels.cache.get(options.category.id)
            } catch {
                return await interaction.editReply({
                    embeds: [new generateEmojiEmbed()
                        .setEmoji("CHANNEL.TEXT.DELETE")
                        .setTitle("Tickets > Category")
                        .setDescription("The channel you provided is not a valid category")
                        .setStatus("Danger")
                    ]
                })
            }
            channel = channel as Discord.CategoryChannel
            if (channel.guild.id != interaction.guild.id) return interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setTitle("Tickets > Category")
                    .setDescription(`You must choose a category in this server`)
                    .setStatus("Danger")
                    .setEmoji("CHANNEL.TEXT.DELETE")
                ]
            });
        }
        if (options.maxtickets) {
            if (options.maxtickets < 1) return interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setTitle("Tickets > Max Tickets")
                    .setDescription(`You must choose a number greater than 0`)
                    .setStatus("Danger")
                    .setEmoji("CHANNEL.TEXT.DELETE")
                ]
            });
        }
        let role
        if (options.supportping) {
            try {
                role = interaction.guild.roles.cache.get(options.supportping.id)
            } catch {
                return await interaction.editReply({
                    embeds: [new generateEmojiEmbed()
                        .setEmoji("GUILD.ROLE.DELETE")
                        .setTitle("Tickets > Support Ping")
                        .setDescription("The role you provided is not a valid role")
                        .setStatus("Danger")
                    ]
                })
            }
            role = role as Discord.Role
            if (role.guild.id != interaction.guild.id) return interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setTitle("Tickets > Support Ping")
                    .setDescription(`You must choose a role in this server`)
                    .setStatus("Danger")
                    .setEmoji("GUILD.ROLE.DELETE")
                ]
            });
        }

        let confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.TICKET.ARCHIVED")
            .setTitle("Tickets")
            .setDescription(
                (options.category ? `**Category:** ${options.category.name}\n` : "") +
                (options.maxtickets ? `**Max Tickets:** ${options.maxtickets}\n` : "") +
                (options.supportping ? `**Support Ping:** ${options.supportping.name}\n` : "") +
                (options.enabled !== null ? `**Enabled:** ${options.enabled ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`
                    }\n` : "") +
                `\nAre you sure you want to apply these settings?`
            )
            .setColor("Warning")
            .setInverted(true)
            .send(true)
        if (confirmation.success) {
            let toUpdate = {}
            if (options.enabled !== null) toUpdate["tickets.enabled"] = options.enabled
            if (options.category) toUpdate["tickets.category"] = options.category.id
            if (options.maxtickets) toUpdate["tickets.maxTickets"] = options.maxtickets
            if (options.supportping) toUpdate["tickets.supportRole"] = options.supportping.id
            try {
                await client.database.write(interaction.guild.id, toUpdate)
            } catch (e) {
                return interaction.editReply({
                    embeds: [new generateEmojiEmbed()
                        .setTitle("Tickets")
                        .setDescription(`Something went wrong and the staff notifications channel could not be set`)
                        .setStatus("Danger")
                        .setEmoji("GUILD.TICKET.DELETE")
                    ], components: []
                });
            }
        } else {
            return interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setTitle("Tickets")
                    .setDescription(`No changes were made`)
                    .setStatus("Success")
                    .setEmoji("GUILD.TICKET.OPEN")
                ], components: []
            });
        }
    }
    let data = await client.database.read(interaction.guild.id);
    data.tickets.customTypes = data.tickets.customTypes.filter((v, i, a) => a.indexOf(v) === i)
    let lastClicked = "";
    let embed;
    data = {
        enabled: data.tickets.enabled,
        category: data.tickets.category,
        maxTickets: data.tickets.maxTickets,
        supportRole: data.tickets.supportRole,
        useCustom: data.tickets.useCustom,
        types: data.tickets.types,
        customTypes: data.tickets.customTypes
    }
    while (true) {
        embed = new generateEmojiEmbed()
            .setTitle("Tickets")
            .setDescription(
                `${data.enabled ? "" : getEmojiByName("TICKETS.REPORT")} **Enabled:** ${data.enabled ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`}\n` +
                `${data.category ? "" : getEmojiByName("TICKETS.REPORT")} **Category:** ${data.category ? `<#${data.category}>` : "*None set*"}\n` +
                `**Max Tickets:** ${data.maxTickets ? data.maxTickets : "*No limit*"}\n` +
                `**Support Ping:** ${data.supportRole ? `<@&${data.supportRole}>` : "*None set*"}\n\n` +
                ((data.useCustom && data.customTypes === null) ? `${getEmojiByName("TICKETS.REPORT")} ` : "") +
                `${data.useCustom ? "Custom" : "Default"} types in use` + "\n\n" +
                `${getEmojiByName("TICKETS.REPORT")} *Indicates a setting stopping tickets from being used*`
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        m = await interaction.editReply({
            embeds: [embed], components: [new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel("Tickets " + (data.enabled ? "enabled" : "disabled"))
                    .setEmoji(getEmojiByName("CONTROL." + (data.enabled ? "TICK" : "CROSS"), "id"))
                    .setStyle(data.enabled ? "SUCCESS" : "DANGER")
                    .setCustomId("enabled"),
                new MessageButton()
                    .setLabel(lastClicked == "cat" ? "Click again to confirm" : "Clear category")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    .setStyle("DANGER")
                    .setCustomId("clearCategory")
                    .setDisabled(data.category == null),
                new MessageButton()
                    .setLabel(lastClicked == "max" ? "Click again to confirm" : "Reset max tickets")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    .setStyle("DANGER")
                    .setCustomId("clearMaxTickets")
                    .setDisabled(data.maxTickets == 5),
                new MessageButton()
                    .setLabel(lastClicked == "sup" ? "Click again to confirm" : "Clear support ping")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    .setStyle("DANGER")
                    .setCustomId("clearSupportPing")
                    .setDisabled(data.supportRole == null),
            ]), new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel("Manage types")
                    .setEmoji(getEmojiByName("TICKETS.OTHER", "id"))
                    .setStyle("SECONDARY")
                    .setCustomId("manageTypes"),
            ])]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({ time: 600000 });
        } catch (e) { break }
        i.deferUpdate()
        if (i.component.customId == "clearCategory") {
            if (lastClicked == "cat") {
                lastClicked = "";
                await client.database.write(interaction.guild.id, {}, ["tickets.category"])
                data.category = undefined;
            } else lastClicked = "cat";
        } else if (i.component.customId == "clearMaxTickets") {
            if (lastClicked == "max") {
                lastClicked = "";
                await client.database.write(interaction.guild.id, {}, ["tickets.maxTickets"])
                data.maxTickets = 5;
            } else lastClicked = "max";
        } else if (i.component.customId == "clearSupportPing") {
            if (lastClicked == "sup") {
                lastClicked = "";
                await client.database.write(interaction.guild.id, {}, ["tickets.supportRole"])
                data.supportRole = undefined;
            } else lastClicked = "sup";
        } else if (i.component.customId == "enabled") {
            await client.database.write(interaction.guild.id, { "tickets.enabled": !data.enabled })
            data.enabled = !data.enabled;
        } else if (i.component.customId == "manageTypes") {
            data = await manageTypes(interaction, data, m);
        } else {
            break
        }
    }
    await interaction.editReply({ embeds: [embed.setFooter({ text: "Message closed" })], components: [] });
}

async function manageTypes(interaction, data, m) {
    while (true) {
        if (data.useCustom) {
            let customTypes = data.customTypes;
            interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setTitle("Tickets > Types")
                    .setDescription(
                        "**Custom types enabled**\n\n" +
                        "**Types in use:**\n" + ((customTypes !== null) ?
                            (customTypes.map((t) => `> ${t}`).join("\n")) :
                            "*None set*"
                        ) + "\n\n" + (customTypes === null ?
                            `${getEmojiByName("TICKETS.REPORT")} Having no types will disable tickets. Please add at least 1 type or use default types` : ""
                        )
                    )
                    .setStatus("Success")
                    .setEmoji("GUILD.TICKET.OPEN")
                ], components: (customTypes ? [
                    new MessageActionRow().addComponents([new Discord.MessageSelectMenu()
                        .setCustomId("removeTypes")
                        .setPlaceholder("Select types to remove")
                        .setMaxValues(customTypes.length)
                        .setMinValues(1)
                        .addOptions(customTypes.map((t) => new SelectMenuOption().setLabel(t).setValue(t)))
                    ])
                ] : []).concat([
                    new MessageActionRow().addComponents([
                        new MessageButton()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle("PRIMARY")
                            .setCustomId("back"),
                        new MessageButton()
                            .setLabel("Add new type")
                            .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
                            .setStyle("PRIMARY")
                            .setCustomId("addType")
                            .setDisabled(customTypes !== null && customTypes.length >= 25),
                        new MessageButton()
                            .setLabel("Switch to default types")
                            .setStyle("SECONDARY")
                            .setCustomId("switchToDefault"),
                    ])
                ])
            });
        } else {
            let inUse = toHexArray(data.types, ticketTypes)
            let options = [];
            ticketTypes.forEach(type => {
                options.push(new SelectMenuOption({
                    label: capitalize(type),
                    value: type,
                    emoji: client.emojis.cache.get(getEmojiByName(`TICKETS.${type.toUpperCase()}`, "id")),
                    default: inUse.includes(type)
                }))
            })
            let selectPane = new MessageActionRow().addComponents([
                new Discord.MessageSelectMenu()
                    .addOptions(options)
                    .setCustomId("types")
                    .setMaxValues(ticketTypes.length)
                    .setMinValues(1)
                    .setPlaceholder("Select types to use")
            ])
            interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setTitle("Tickets > Types")
                    .setDescription(
                        "**Default types enabled**\n\n" +
                        "**Types in use:**\n" +
                        (inUse.map((t) => `> ${getEmojiByName("TICKETS." + t.toUpperCase())} ${capitalize(t)}`).join("\n"))
                    )
                    .setStatus("Success")
                    .setEmoji("GUILD.TICKET.OPEN")
                ], components: [
                    selectPane,
                    new MessageActionRow().addComponents([
                        new MessageButton()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle("PRIMARY")
                            .setCustomId("back"),
                        new MessageButton()
                            .setLabel("Switch to custom types")
                            .setStyle("SECONDARY")
                            .setCustomId("switchToCustom"),
                    ])
                ]
            });
        }
        let i;
        try {
            i = await m.awaitMessageComponent({ time: 600000 });
        } catch (e) { break }
        if (i.component.customId == "types") {
            i.deferUpdate()
            let types = toHexInteger(i.values, ticketTypes);
            await client.database.write(interaction.guild.id, { "tickets.types": types })
            data.types = types;
        } else if (i.component.customId == "removeTypes") {
            i.deferUpdate()
            let types = i.values
            let customTypes = data.customTypes;
            if (customTypes) {
                customTypes = customTypes.filter((t) => !types.includes(t));
                customTypes = customTypes.length > 0 ? customTypes : null;
                await client.database.write(interaction.guild.id, { "tickets.customTypes": customTypes })
                data.customTypes = customTypes;
            }
        } else if (i.component.customId == "addType") {
            await i.showModal(new Discord.Modal().setCustomId("modal").setTitle("Enter a name for the new type").addComponents(
                // @ts-ignore
                new MessageActionRow().addComponents(new TextInputComponent()
                    .setCustomId("type")
                    .setLabel("Name")
                    .setMaxLength(100)
                    .setMinLength(1)
                    .setPlaceholder("E.g. \"Server Idea\"")
                    .setRequired(true)
                    .setStyle("SHORT")
                )
            ))
            await interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setTitle("Tickets > Types")
                    .setDescription("Modal opened. If you can't see it, click back and try again.")
                    .setStatus("Success")
                    .setEmoji("GUILD.TICKET.OPEN")
                ], components: [new MessageActionRow().addComponents([new MessageButton()
                    .setLabel("Back")
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                    .setStyle("PRIMARY")
                    .setCustomId("back")
                ])]
            });
            let out
            try {
                out = await modalInteractionCollector(m, (m) => m.channel.id == interaction.channel.id, (m) => m.customId == "addType")
            } catch (e) { continue }
            if (out.fields) {
                let toAdd = out.fields.getTextInputValue("type");
                if (!toAdd) { continue }
                try {
                    await client.database.append(interaction.guild.id, "tickets.customTypes", toAdd)
                } catch { continue }
                data.customTypes = data.customTypes || [];
                if (!data.customTypes.includes(toAdd)) {
                    data.customTypes.push(toAdd);
                }
            } else { continue }
        } else if (i.component.customId == "switchToDefault") {
            i.deferUpdate()
            await client.database.write(interaction.guild.id, { "tickets.useCustom": false }, [])
            data.useCustom = false;
        } else if (i.component.customId == "switchToCustom") {
            i.deferUpdate()
            await client.database.write(interaction.guild.id, { "tickets.useCustom": true }, [])
            data.useCustom = true;
        } else {
            i.deferUpdate()
            break
        }
    }
    return data
}


const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as Discord.GuildMember)
    if (!member.permissions.has("MANAGE_GUILD")) throw "You must have the `manage_server` permission to use this command"
    return true;
}

export { command };
export { callback };
export { check };