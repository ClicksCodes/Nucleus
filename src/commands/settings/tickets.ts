import { LoadingEmbed } from "../../utils/defaults.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import Discord, {
    CommandInteraction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    TextInputBuilder,
    ButtonComponent,
    ModalSubmitInteraction,
    APIMessageComponentEmoji,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuInteraction,
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    TextInputStyle,
    ModalBuilder,
    ChannelType
} from "discord.js";
import { SlashCommandSubcommandBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import client from "../../utils/client.js";
import { toHexInteger, toHexArray, tickets as ticketTypes } from "../../utils/calculate.js";
import { capitalize } from "../../utils/generateKeyValueList.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import type { GuildConfig } from "../../utils/database.js";
import { LinkWarningFooter } from "../../utils/defaults.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("tickets")
        .setDescription("Shows settings for tickets")

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    let m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Message;
    const data = await client.database.guilds.read(interaction.guild.id);
    data.tickets.customTypes = (data.tickets.customTypes ?? []).filter(
        (value: string, index: number, array: string[]) => array.indexOf(value) === index
    );
    let ticketData = (await client.database.guilds.read(interaction.guild.id)).tickets
    let changesMade = false;
    let timedOut = false;
    let errorMessage = "";
    while (!timedOut) {
        const embed: EmojiEmbed = new EmojiEmbed()
            .setTitle("Tickets")
            .setDescription(
                `${ticketData.enabled ? "" : getEmojiByName("TICKETS.REPORT")} **Enabled:** ${
                    ticketData.enabled ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`
                }\n` +
                    `${ticketData.category ? "" : getEmojiByName("TICKETS.REPORT")}` +
                    ((await interaction.guild.channels.fetch(ticketData.category!))!.type === ChannelType.GuildCategory ?
                    `**Category:** ` : `**Channel:** `) +  // TODO: Notify if permissions are wrong
                    `${ticketData.category ? `<#${ticketData.category}>` : "*None set*"}\n` +
                    `**Max Tickets:** ${ticketData.maxTickets ? ticketData.maxTickets : "*No limit*"}\n` +
                    `**Support Ping:** ${ticketData.supportRole ? `<@&${ticketData.supportRole}>` : "*None set*"}\n\n` +
                    (ticketData.useCustom && ticketData.customTypes === null ? `${getEmojiByName("TICKETS.REPORT")} ` : "") +
                    `${ticketData.useCustom ? "Custom" : "Default"} types in use` +
                    "\n\n" +
                    `${getEmojiByName("TICKETS.REPORT")} *Indicates a setting stopping tickets from being used*`
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN");
        if (errorMessage) embed.setFooter({text: errorMessage, iconURL: LinkWarningFooter.iconURL});
        m = (await interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel("Tickets " + (ticketData.enabled ? "enabled" : "disabled"))
                        .setEmoji(getEmojiByName("CONTROL." + (ticketData.enabled ? "TICK" : "CROSS"), "id"))
                        .setStyle(ticketData.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setCustomId("enabled"),
                    new ButtonBuilder()
                        .setLabel("Set max tickets")
                        .setEmoji(getEmojiByName("CONTROL.TICKET", "id"))
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("setMaxTickets")
                        .setDisabled(!ticketData.enabled),
                    new ButtonBuilder()
                        .setLabel("Manage types")
                        .setEmoji(getEmojiByName("TICKETS.OTHER", "id"))
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("manageTypes")
                        .setDisabled(!ticketData.enabled),
                    new ButtonBuilder()
                        .setLabel("Save")
                        .setEmoji(getEmojiByName("ICONS.SAVE", "id"))
                        .setStyle(ButtonStyle.Success)
                        .setCustomId("save")
                        .setDisabled(!changesMade)
                ),
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId("supportRole")
                        .setPlaceholder("Select a support role")
                        .setDisabled(!ticketData.enabled)
                ),
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId("category")
                        .setPlaceholder("Select a category or channel")
                        .setDisabled(!ticketData.enabled)
                )
            ]
        }));
        let i: RoleSelectMenuInteraction | ButtonInteraction | ChannelSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent<2 | 6 | 8>({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.message.id === m.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        changesMade = true;
        if (i.isRoleSelectMenu()) {
            await i.deferUpdate();
            ticketData.supportRole = i.values[0] ?? null;
        } else if (i.isChannelSelectMenu()) {
            await i.deferUpdate();
            ticketData.category = i.values[0] ?? null;
        } else {
            switch(i.customId) {
                case "save": {
                    await i.deferUpdate();
                    await client.database.guilds.write(interaction.guild.id, { tickets: ticketData });
                    changesMade = false;
                    break;
                }
                case "enabled": {
                    await i.deferUpdate();
                    ticketData.enabled = !ticketData.enabled;
                    break;
                }
                case "setMaxTickets": {
                    await i.showModal(
                        new ModalBuilder()
                            .setCustomId("maxTickets")
                            .setTitle("Set max tickets")
                            .addComponents(
                                new ActionRowBuilder<TextInputBuilder>().setComponents(
                                    new TextInputBuilder()
                                        .setLabel("Max tickets - Leave blank for no limit")
                                        .setCustomId("maxTickets")
                                        .setPlaceholder("Enter a number")
                                        .setRequired(false)
                                        .setValue(ticketData.maxTickets.toString() ?? "")
                                        .setMinLength(1)
                                        .setMaxLength(3)
                                        .setStyle(TextInputStyle.Short)
                                )
                            )
                    )
                    await i.editReply({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle("Tickets")
                                .setDescription("Modal opened. If you can't see it, click back and try again.")
                                .setStatus("Success")
                                .setEmoji("GUILD.TICKET.OPEN")
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents([
                                new ButtonBuilder()
                                    .setLabel("Back")
                                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                    .setStyle(ButtonStyle.Primary)
                                    .setCustomId("back")
                            ])
                        ]
                    });
                    let out;
                    try {
                        out = await modalInteractionCollector(m, interaction.user);
                    } catch (e) {
                        continue;
                    }
                    if (!out || out.isButton()) continue;
                    out = out as ModalSubmitInteraction;
                    let toAdd = out.fields.getTextInputValue("maxTickets");
                    if(isNaN(parseInt(toAdd))) {
                        errorMessage = "You entered an invalid number - No changes were made";
                        break;
                    }
                    ticketData.maxTickets = toAdd === "" ? 0 : parseInt(toAdd);
                    break;
                }
                case "manageTypes": {
                    await i.deferUpdate();
                    ticketData = await manageTypes(interaction, data.tickets, m);
                    break;
                }
            }
        }
    }
    await interaction.deleteReply()
};



async function manageTypes(interaction: CommandInteraction, data: GuildConfig["tickets"], m: Message) {
    let timedOut = false;
    let backPressed = false;
    while (!timedOut && !backPressed) {
        if (data.useCustom) {
            const customTypes = data.customTypes;
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Tickets > Types")
                        .setDescription(
                            "**Custom types enabled**\n\n" +
                                "**Types in use:**\n" +
                                (customTypes !== null ? customTypes.map((t) => `> ${t}`).join("\n") : "*None set*") +
                                "\n\n" +
                                (customTypes === null
                                    ? `${getEmojiByName(
                                          "TICKETS.REPORT"
                                      )} Having no types will disable tickets. Please add at least 1 type or use default types`
                                    : "")
                        )
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: (customTypes && customTypes.length > 0
                    ? [
                          new ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>().addComponents([
                              new Discord.StringSelectMenuBuilder()
                                  .setCustomId("removeTypes")
                                  .setPlaceholder("Select types to remove")
                                  .setMaxValues(customTypes.length)
                                  .setMinValues(1)
                                  .addOptions(
                                      customTypes.map((t) => ({
                                          label: t,
                                          value: t
                                      }))
                                  )
                          ])
                      ]
                    : []
                ).concat([
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId("back"),
                        new ButtonBuilder()
                            .setLabel("Add new type")
                            .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId("addType")
                            .setDisabled(customTypes !== null && customTypes.length >= 25),
                        new ButtonBuilder()
                            .setLabel("Switch to default types")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("switchToDefault")
                    ])
                ])
            });
        } else {
            const inUse = toHexArray(data.types, ticketTypes);
            const options: StringSelectMenuOptionBuilder[] = [];
            ticketTypes.forEach((type) => {
                options.push(
                    new StringSelectMenuOptionBuilder({
                        label: capitalize(type),
                        value: type,
                        emoji: client.emojis.cache.get(getEmojiByName(`TICKETS.${type.toUpperCase()}`, "id")) as APIMessageComponentEmoji,
                        default: inUse.includes(type)
                    })
                );
            });
            const selectPane = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
                new Discord.StringSelectMenuBuilder()
                    .addOptions(options)
                    .setCustomId("types")
                    .setMaxValues(ticketTypes.length)
                    .setMinValues(1)
                    .setPlaceholder("Select types to use")
            ]);
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Tickets > Types")
                        .setDescription(
                            "**Default types enabled**\n\n" +
                                "**Types in use:**\n" +
                                inUse
                                    .map((t) => `> ${getEmojiByName("TICKETS." + t.toUpperCase())} ${capitalize(t)}`)
                                    .join("\n")
                        )
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: [
                    selectPane,
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId("back"),
                        new ButtonBuilder()
                            .setLabel("Switch to custom types")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("switchToCustom")
                    ])
                ]
            });
        }
        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.message.id === m.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        if (i.isStringSelectMenu() && i.customId === "types") {
            await i.deferUpdate();
            const types = toHexInteger(i.values, ticketTypes);
            data.types = types;
        } else if (i.isStringSelectMenu() && i.customId === "removeTypes") {
            await i.deferUpdate();
            const types = i.values;
            let customTypes = data.customTypes;
            if (customTypes) {
                customTypes = customTypes.filter((t) => !types.includes(t));
                customTypes = customTypes.length > 0 ? customTypes : null;
                data.customTypes = customTypes;
            }
        } else if ((i.component as ButtonComponent).customId === "addType") {
            await i.showModal(
                new Discord.ModalBuilder()
                    .setCustomId("modal")
                    .setTitle("Enter a name for the new type")
                    .addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId("type")
                                .setLabel("Name")
                                .setMaxLength(100)
                                .setMinLength(1)
                                .setPlaceholder('E.g. "Server Idea"')
                                .setRequired(true)
                                .setStyle(Discord.TextInputStyle.Short)
                        )
                    )
            );
            await i.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Tickets > Types")
                        .setDescription("Modal opened. If you can't see it, click back and try again.")
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId("back")
                    ])
                ]
            });
            let out;
            try {
                out = await modalInteractionCollector(m, interaction.user);
            } catch (e) {
                continue;
            }
            if (!out || out.isButton()) continue;
            out = out as ModalSubmitInteraction;
            let toAdd = out.fields.getTextInputValue("type");
            if (!toAdd) {
                continue;
            }
            toAdd = toAdd.substring(0, 80);
            try {
                if(!data.customTypes) data.customTypes = [];
                data.customTypes?.push(toAdd);
            } catch {
                continue;
            }
            data.customTypes = data.customTypes ?? [];
            if (!data.customTypes.includes(toAdd)) {
                data.customTypes.push(toAdd);
            }
        } else if ((i.component as ButtonComponent).customId === "switchToDefault") {
            await i.deferUpdate();
            await client.database.guilds.write(interaction.guild!.id, { "tickets.useCustom": false }, []);
            data.useCustom = false;
        } else if ((i.component as ButtonComponent).customId === "switchToCustom") {
            await i.deferUpdate();
            await client.database.guilds.write(interaction.guild!.id, { "tickets.useCustom": true }, []);
            data.useCustom = true;
        } else {
            await i.deferUpdate();
            backPressed = true;
        }
    }
    return data;
}

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
