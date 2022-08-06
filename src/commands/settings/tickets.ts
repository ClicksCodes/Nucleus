import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import Discord, {
    CommandInteraction,
    GuildChannel,
    Message,
    MessageActionRow,
    MessageActionRowComponent,
    MessageButton,
    MessageComponentInteraction,
    MessageSelectMenu,
    Role,
    SelectMenuInteraction,
    TextInputComponent
} from "discord.js";
import {
    SelectMenuOption,
    SlashCommandSubcommandBuilder
} from "@discordjs/builders";
import { ChannelType } from "discord-api-types/v9";
import client from "../../utils/client.js";
import {
    toHexInteger,
    toHexArray,
    tickets as ticketTypes
} from "../../utils/calculate.js";
import { capitalize } from "../../utils/generateKeyValueList.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import { GuildConfig } from "../../utils/database.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("tickets")
        .setDescription(
            "Shows settings for tickets | Use no arguments to manage custom types"
        )
        .addStringOption((option) =>
            option
                .setName("enabled")
                .setDescription("If users should be able to create tickets")
                .setRequired(false)
                .addChoices([
                    ["Yes", "yes"],
                    ["No", "no"]
                ])
        )
        .addChannelOption((option) =>
            option
                .setName("category")
                .setDescription("The category where tickets are created")
                .addChannelType(ChannelType.GuildCategory)
                .setRequired(false)
        )
        .addNumberOption((option) =>
            option
                .setName("maxticketsperuser")
                .setDescription(
                    "The maximum amount of tickets a user can create | Default: 5"
                )
                .setRequired(false)
                .setMinValue(1)
        )
        .addRoleOption((option) =>
            option
                .setName("supportrole")
                .setDescription(
                    "This role will have view access to all tickets and will be pinged when a ticket is created"
                )
                .setRequired(false)
        );

const callback = async (
    interaction: CommandInteraction
): Promise<void | unknown> => {
    let m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Message;
    const options = {
        enabled: interaction.options.getString("enabled") as string | boolean,
        category: interaction.options.getChannel("category"),
        maxtickets: interaction.options.getNumber("maxticketsperuser"),
        supportping: interaction.options.getRole("supportrole")
    };
    if (
        options.enabled !== null ||
        options.category ||
        options.maxtickets ||
        options.supportping
    ) {
        options.enabled = options.enabled === "yes" ? true : false;
        if (options.category) {
            let channel: GuildChannel;
            try {
                channel = await interaction.guild.channels.fetch(
                    options.category.id
                );
            } catch {
                return await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("CHANNEL.TEXT.DELETE")
                            .setTitle("Tickets > Category")
                            .setDescription(
                                "The channel you provided is not a valid category"
                            )
                            .setStatus("Danger")
                    ]
                });
            }
            channel = channel as Discord.CategoryChannel;
            if (channel.guild.id !== interaction.guild.id)
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Tickets > Category")
                            .setDescription(
                                "You must choose a category in this server"
                            )
                            .setStatus("Danger")
                            .setEmoji("CHANNEL.TEXT.DELETE")
                    ]
                });
        }
        if (options.maxtickets) {
            if (options.maxtickets < 1)
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Tickets > Max Tickets")
                            .setDescription(
                                "You must choose a number greater than 0"
                            )
                            .setStatus("Danger")
                            .setEmoji("CHANNEL.TEXT.DELETE")
                    ]
                });
        }
        let role: Role;
        if (options.supportping) {
            try {
                role = await interaction.guild.roles.fetch(
                    options.supportping.id
                );
            } catch {
                return await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("GUILD.ROLE.DELETE")
                            .setTitle("Tickets > Support Ping")
                            .setDescription(
                                "The role you provided is not a valid role"
                            )
                            .setStatus("Danger")
                    ]
                });
            }
            role = role as Discord.Role;
            if (role.guild.id !== interaction.guild.id)
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Tickets > Support Ping")
                            .setDescription(
                                "You must choose a role in this server"
                            )
                            .setStatus("Danger")
                            .setEmoji("GUILD.ROLE.DELETE")
                    ]
                });
        }

        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.TICKET.ARCHIVED")
            .setTitle("Tickets")
            .setDescription(
                (options.category
                    ? `**Category:** ${options.category.name}\n`
                    : "") +
                    (options.maxtickets
                        ? `**Max Tickets:** ${options.maxtickets}\n`
                        : "") +
                    (options.supportping
                        ? `**Support Ping:** ${options.supportping.name}\n`
                        : "") +
                    (options.enabled !== null
                        ? `**Enabled:** ${
                              options.enabled
                                  ? `${getEmojiByName("CONTROL.TICK")} Yes`
                                  : `${getEmojiByName("CONTROL.CROSS")} No`
                          }\n`
                        : "") +
                    "\nAre you sure you want to apply these settings?"
            )
            .setColor("Warning")
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            const toUpdate = {};
            if (options.enabled !== null)
                toUpdate["tickets.enabled"] = options.enabled;
            if (options.category)
                toUpdate["tickets.category"] = options.category.id;
            if (options.maxtickets)
                toUpdate["tickets.maxTickets"] = options.maxtickets;
            if (options.supportping)
                toUpdate["tickets.supportRole"] = options.supportping.id;
            try {
                await client.database.guilds.write(
                    interaction.guild.id,
                    toUpdate
                );
            } catch (e) {
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Tickets")
                            .setDescription(
                                "Something went wrong and the staff notifications channel could not be set"
                            )
                            .setStatus("Danger")
                            .setEmoji("GUILD.TICKET.DELETE")
                    ],
                    components: []
                });
            }
        } else {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Tickets")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: []
            });
        }
    }
    let data = await client.database.guilds.read(interaction.guild.id);
    data.tickets.customTypes = (data.tickets.customTypes || []).filter(
        (value: string, index: number, array: string[]) =>
            array.indexOf(value) === index
    );
    let lastClicked = "";
    let embed: EmojiEmbed;
    data = {
        enabled: data.tickets.enabled,
        category: data.tickets.category,
        maxTickets: data.tickets.maxTickets,
        supportRole: data.tickets.supportRole,
        useCustom: data.tickets.useCustom,
        types: data.tickets.types,
        customTypes: data.tickets.customTypes
    };
    while (true) {
        embed = new EmojiEmbed()
            .setTitle("Tickets")
            .setDescription(
                `${
                    data.enabled ? "" : getEmojiByName("TICKETS.REPORT")
                } **Enabled:** ${
                    data.enabled
                        ? `${getEmojiByName("CONTROL.TICK")} Yes`
                        : `${getEmojiByName("CONTROL.CROSS")} No`
                }\n` +
                    `${
                        data.category ? "" : getEmojiByName("TICKETS.REPORT")
                    } **Category:** ${
                        data.category ? `<#${data.category}>` : "*None set*"
                    }\n` +
                    `**Max Tickets:** ${
                        data.maxTickets ? data.maxTickets : "*No limit*"
                    }\n` +
                    `**Support Ping:** ${
                        data.supportRole
                            ? `<@&${data.supportRole}>`
                            : "*None set*"
                    }\n\n` +
                    (data.useCustom && data.customTypes === null
                        ? `${getEmojiByName("TICKETS.REPORT")} `
                        : "") +
                    `${data.useCustom ? "Custom" : "Default"} types in use` +
                    "\n\n" +
                    `${getEmojiByName(
                        "TICKETS.REPORT"
                    )} *Indicates a setting stopping tickets from being used*`
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN");
        m = (await interaction.editReply({
            embeds: [embed],
            components: [
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setLabel(
                            "Tickets " + (data.enabled ? "enabled" : "disabled")
                        )
                        .setEmoji(
                            getEmojiByName(
                                "CONTROL." + (data.enabled ? "TICK" : "CROSS"),
                                "id"
                            )
                        )
                        .setStyle(data.enabled ? "SUCCESS" : "DANGER")
                        .setCustomId("enabled"),
                    new MessageButton()
                        .setLabel(
                            lastClicked === "cat"
                                ? "Click again to confirm"
                                : "Clear category"
                        )
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle("DANGER")
                        .setCustomId("clearCategory")
                        .setDisabled(data.category === null),
                    new MessageButton()
                        .setLabel(
                            lastClicked === "max"
                                ? "Click again to confirm"
                                : "Reset max tickets"
                        )
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle("DANGER")
                        .setCustomId("clearMaxTickets")
                        .setDisabled(data.maxTickets === 5),
                    new MessageButton()
                        .setLabel(
                            lastClicked === "sup"
                                ? "Click again to confirm"
                                : "Clear support ping"
                        )
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle("DANGER")
                        .setCustomId("clearSupportPing")
                        .setDisabled(data.supportRole === null)
                ]),
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setLabel("Manage types")
                        .setEmoji(getEmojiByName("TICKETS.OTHER", "id"))
                        .setStyle("SECONDARY")
                        .setCustomId("manageTypes"),
                    new MessageButton()
                        .setLabel("Add create ticket button")
                        .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
                        .setStyle("PRIMARY")
                        .setCustomId("send")
                ])
            ]
        })) as Message;
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            break;
        }
        i.deferUpdate();
        if (
            (i.component as MessageActionRowComponent).customId ===
            "clearCategory"
        ) {
            if (lastClicked === "cat") {
                lastClicked = "";
                await client.database.guilds.write(interaction.guild.id, null, [
                    "tickets.category"
                ]);
                data.category = undefined;
            } else lastClicked = "cat";
        } else if (
            (i.component as MessageActionRowComponent).customId ===
            "clearMaxTickets"
        ) {
            if (lastClicked === "max") {
                lastClicked = "";
                await client.database.guilds.write(interaction.guild.id, null, [
                    "tickets.maxTickets"
                ]);
                data.maxTickets = 5;
            } else lastClicked = "max";
        } else if (
            (i.component as MessageActionRowComponent).customId ===
            "clearSupportPing"
        ) {
            if (lastClicked === "sup") {
                lastClicked = "";
                await client.database.guilds.write(interaction.guild.id, null, [
                    "tickets.supportRole"
                ]);
                data.supportRole = undefined;
            } else lastClicked = "sup";
        } else if (
            (i.component as MessageActionRowComponent).customId === "send"
        ) {
            const ticketMessages = [
                {
                    label: "Create ticket",
                    description: "Click the button below to create a ticket"
                },
                {
                    label: "Issues, questions or feedback?",
                    description:
                        "Click below to open a ticket and get help from our staff team"
                },
                {
                    label: "Contact Us",
                    description:
                        "Click the button below to speak to us privately"
                }
            ];
            while (true) {
                const enabled = data.enabled && data.category !== null;
                await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Ticket Button")
                            .setDescription(
                                "Select a message template to send in this channel"
                            )
                            .setFooter({
                                text: enabled
                                    ? ""
                                    : "Tickets are not set up correctly so the button may not work for users. Check the main menu to find which options must be set."
                            })
                            .setStatus(enabled ? "Success" : "Warning")
                            .setEmoji("GUILD.ROLES.CREATE")
                    ],
                    components: [
                        new MessageActionRow().addComponents([
                            new MessageSelectMenu()
                                .setOptions(
                                    ticketMessages.map(
                                        (
                                            t: {
                                                label: string;
                                                description: string;
                                                value?: string;
                                            },
                                            index
                                        ) => {
                                            t.value = index.toString();
                                            return t as {
                                                value: string;
                                                label: string;
                                                description: string;
                                            };
                                        }
                                    )
                                )
                                .setCustomId("template")
                                .setMaxValues(1)
                                .setMinValues(1)
                                .setPlaceholder("Select a message template")
                        ]),
                        new MessageActionRow().addComponents([
                            new MessageButton()
                                .setCustomId("back")
                                .setLabel("Back")
                                .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                .setStyle("DANGER"),
                            new MessageButton()
                                .setCustomId("blank")
                                .setLabel("Empty")
                                .setStyle("SECONDARY"),
                            new MessageButton()
                                .setCustomId("custom")
                                .setLabel("Custom")
                                .setEmoji(getEmojiByName("TICKETS.OTHER", "id"))
                                .setStyle("PRIMARY")
                        ])
                    ]
                });
                let i: MessageComponentInteraction;
                try {
                    i = await m.awaitMessageComponent({ time: 300000 });
                } catch (e) {
                    break;
                }
                if (
                    (i.component as MessageActionRowComponent).customId ===
                    "template"
                ) {
                    i.deferUpdate();
                    await interaction.channel.send({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle(
                                    ticketMessages[
                                        parseInt(
                                            (i as SelectMenuInteraction)
                                                .values[0]
                                        )
                                    ].label
                                )
                                .setDescription(
                                    ticketMessages[
                                        parseInt(
                                            (i as SelectMenuInteraction)
                                                .values[0]
                                        )
                                    ].description
                                )
                                .setStatus("Success")
                                .setEmoji("GUILD.TICKET.OPEN")
                        ],
                        components: [
                            new MessageActionRow().addComponents([
                                new MessageButton()
                                    .setLabel("Create Ticket")
                                    .setEmoji(
                                        getEmojiByName("CONTROL.TICK", "id")
                                    )
                                    .setStyle("SUCCESS")
                                    .setCustomId("createticket")
                            ])
                        ]
                    });
                    break;
                } else if (
                    (i.component as MessageActionRowComponent).customId ===
                    "blank"
                ) {
                    i.deferUpdate();
                    await interaction.channel.send({
                        components: [
                            new MessageActionRow().addComponents([
                                new MessageButton()
                                    .setLabel("Create Ticket")
                                    .setEmoji(
                                        getEmojiByName(
                                            "TICKETS.SUGGESTION",
                                            "id"
                                        )
                                    )
                                    .setStyle("SUCCESS")
                                    .setCustomId("createticket")
                            ])
                        ]
                    });
                    break;
                } else if (
                    (i.component as MessageActionRowComponent).customId ===
                    "custom"
                ) {
                    await i.showModal(
                        new Discord.Modal()
                            .setCustomId("modal")
                            .setTitle("Enter embed details")
                            .addComponents(
                                new MessageActionRow<TextInputComponent>().addComponents(
                                    new TextInputComponent()
                                        .setCustomId("title")
                                        .setLabel("Title")
                                        .setMaxLength(256)
                                        .setRequired(true)
                                        .setStyle("SHORT")
                                ),
                                new MessageActionRow<TextInputComponent>().addComponents(
                                    new TextInputComponent()
                                        .setCustomId("description")
                                        .setLabel("Description")
                                        .setMaxLength(4000)
                                        .setRequired(true)
                                        .setStyle("PARAGRAPH")
                                )
                            )
                    );
                    await interaction.editReply({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle("Ticket Button")
                                .setDescription(
                                    "Modal opened. If you can't see it, click back and try again."
                                )
                                .setStatus("Success")
                                .setEmoji("GUILD.TICKET.OPEN")
                        ],
                        components: [
                            new MessageActionRow().addComponents([
                                new MessageButton()
                                    .setLabel("Back")
                                    .setEmoji(
                                        getEmojiByName("CONTROL.LEFT", "id")
                                    )
                                    .setStyle("PRIMARY")
                                    .setCustomId("back")
                            ])
                        ]
                    });
                    let out;
                    try {
                        out = await modalInteractionCollector(
                            m,
                            (m) => m.channel.id === interaction.channel.id,
                            (m) => m.customId === "modify"
                        );
                    } catch (e) {
                        break;
                    }
                    if (out.fields) {
                        const title = out.fields.getTextInputValue("title");
                        const description =
                            out.fields.getTextInputValue("description");
                        await interaction.channel.send({
                            embeds: [
                                new EmojiEmbed()
                                    .setTitle(title)
                                    .setDescription(description)
                                    .setStatus("Success")
                                    .setEmoji("GUILD.TICKET.OPEN")
                            ],
                            components: [
                                new MessageActionRow().addComponents([
                                    new MessageButton()
                                        .setLabel("Create Ticket")
                                        .setEmoji(
                                            getEmojiByName(
                                                "TICKETS.SUGGESTION",
                                                "id"
                                            )
                                        )
                                        .setStyle("SUCCESS")
                                        .setCustomId("createticket")
                                ])
                            ]
                        });
                        break;
                    } else {
                        continue;
                    }
                }
            }
        } else if (
            (i.component as MessageActionRowComponent).customId === "enabled"
        ) {
            await client.database.guilds.write(interaction.guild.id, {
                "tickets.enabled": !data.enabled
            });
            data.enabled = !data.enabled;
        } else if (
            (i.component as MessageActionRowComponent).customId ===
            "manageTypes"
        ) {
            data = await manageTypes(interaction, data, m as Message);
        } else {
            break;
        }
    }
    await interaction.editReply({
        embeds: [embed.setFooter({ text: "Message closed" })],
        components: []
    });
};

async function manageTypes(
    interaction: CommandInteraction,
    data: GuildConfig["tickets"],
    m: Message
) {
    while (true) {
        if (data.useCustom) {
            const customTypes = data.customTypes;
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Tickets > Types")
                        .setDescription(
                            "**Custom types enabled**\n\n" +
                                "**Types in use:**\n" +
                                (customTypes !== null
                                    ? customTypes
                                          .map((t) => `> ${t}`)
                                          .join("\n")
                                    : "*None set*") +
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
                components: (customTypes
                    ? [
                          new MessageActionRow().addComponents([
                              new Discord.MessageSelectMenu()
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
                    new MessageActionRow().addComponents([
                        new MessageButton()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle("PRIMARY")
                            .setCustomId("back"),
                        new MessageButton()
                            .setLabel("Add new type")
                            .setEmoji(
                                getEmojiByName("TICKETS.SUGGESTION", "id")
                            )
                            .setStyle("PRIMARY")
                            .setCustomId("addType")
                            .setDisabled(
                                customTypes !== null && customTypes.length >= 25
                            ),
                        new MessageButton()
                            .setLabel("Switch to default types")
                            .setStyle("SECONDARY")
                            .setCustomId("switchToDefault")
                    ])
                ])
            });
        } else {
            const inUse = toHexArray(data.types, ticketTypes);
            const options = [];
            ticketTypes.forEach((type) => {
                options.push(
                    new SelectMenuOption({
                        label: capitalize(type),
                        value: type,
                        emoji: client.emojis.cache.get(
                            getEmojiByName(
                                `TICKETS.${type.toUpperCase()}`,
                                "id"
                            )
                        ),
                        default: inUse.includes(type)
                    })
                );
            });
            const selectPane = new MessageActionRow().addComponents([
                new Discord.MessageSelectMenu()
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
                                    .map(
                                        (t) =>
                                            `> ${getEmojiByName(
                                                "TICKETS." + t.toUpperCase()
                                            )} ${capitalize(t)}`
                                    )
                                    .join("\n")
                        )
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: [
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
                            .setCustomId("switchToCustom")
                    ])
                ]
            });
        }
        let i;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            break;
        }
        if (i.component.customId === "types") {
            i.deferUpdate();
            const types = toHexInteger(i.values, ticketTypes);
            await client.database.guilds.write(interaction.guild.id, {
                "tickets.types": types
            });
            data.types = types;
        } else if (i.component.customId === "removeTypes") {
            i.deferUpdate();
            const types = i.values;
            let customTypes = data.customTypes;
            if (customTypes) {
                customTypes = customTypes.filter((t) => !types.includes(t));
                customTypes = customTypes.length > 0 ? customTypes : null;
                await client.database.guilds.write(interaction.guild.id, {
                    "tickets.customTypes": customTypes
                });
                data.customTypes = customTypes;
            }
        } else if (i.component.customId === "addType") {
            await i.showModal(
                new Discord.Modal()
                    .setCustomId("modal")
                    .setTitle("Enter a name for the new type")
                    .addComponents(
                        new MessageActionRow<TextInputComponent>().addComponents(
                            new TextInputComponent()
                                .setCustomId("type")
                                .setLabel("Name")
                                .setMaxLength(100)
                                .setMinLength(1)
                                .setPlaceholder('E.g. "Server Idea"')
                                .setRequired(true)
                                .setStyle("SHORT")
                        )
                    )
            );
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Tickets > Types")
                        .setDescription(
                            "Modal opened. If you can't see it, click back and try again."
                        )
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: [
                    new MessageActionRow().addComponents([
                        new MessageButton()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle("PRIMARY")
                            .setCustomId("back")
                    ])
                ]
            });
            let out;
            try {
                out = await modalInteractionCollector(
                    m,
                    (m) => m.channel.id === interaction.channel.id,
                    (m) => m.customId === "addType"
                );
            } catch (e) {
                continue;
            }
            if (out.fields) {
                let toAdd = out.fields.getTextInputValue("type");
                if (!toAdd) {
                    continue;
                }
                toAdd = toAdd.substring(0, 80);
                try {
                    await client.database.guilds.append(
                        interaction.guild.id,
                        "tickets.customTypes",
                        toAdd
                    );
                } catch {
                    continue;
                }
                data.customTypes = data.customTypes || [];
                if (!data.customTypes.includes(toAdd)) {
                    data.customTypes.push(toAdd);
                }
            } else {
                continue;
            }
        } else if (i.component.customId === "switchToDefault") {
            i.deferUpdate();
            await client.database.guilds.write(
                interaction.guild.id,
                { "tickets.useCustom": false },
                []
            );
            data.useCustom = false;
        } else if (i.component.customId === "switchToCustom") {
            i.deferUpdate();
            await client.database.guilds.write(
                interaction.guild.id,
                { "tickets.useCustom": true },
                []
            );
            data.useCustom = true;
        } else {
            i.deferUpdate();
            break;
        }
    }
    return data;
}

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_GUILD"))
        throw "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
