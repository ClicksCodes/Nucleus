import { LoadingEmbed } from "../../utils/defaults.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import Discord, {
    CommandInteraction,
    GuildChannel,
    Message,
    ActionRowBuilder,
    Component,
    ButtonBuilder,
    MessageComponentInteraction,
    StringSelectMenuBuilder,
    Role,
    StringSelectMenuInteraction,
    ButtonStyle,
    TextInputBuilder,
    ButtonComponent,
    StringSelectMenuComponent,
    ModalSubmitInteraction,
    APIMessageComponentEmoji
} from "discord.js";
import { SlashCommandSubcommandBuilder, StringSelectMenuOptionBuilder } from "@discordjs/builders";
import { ChannelType } from "discord-api-types/v9";
import client from "../../utils/client.js";
import { toHexInteger, toHexArray, tickets as ticketTypes } from "../../utils/calculate.js";
import { capitalize } from "../../utils/generateKeyValueList.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import type { GuildConfig } from "../../utils/database.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("tickets")
        .setDescription("Shows settings for tickets | Use no arguments to manage custom types")
        .addStringOption((option) =>
            option
                .setName("enabled")
                .setDescription("If users should be able to create tickets")
                .setRequired(false)
                .addChoices(
                    {name: "Yes", value: "yes"},
                    {name: "No",value:  "no"}
                )
        )
        .addChannelOption((option) =>
            option
                .setName("category")
                .setDescription("The category where tickets are created")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false)
        )
        .addNumberOption((option) =>
            option
                .setName("maxticketsperuser")
                .setDescription("The maximum amount of tickets a user can create | Default: 5")
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

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    let m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Message;
    const options = {
        enabled: (interaction.options.get("enabled")?.value as string).startsWith("yes") as boolean | null,
        category: interaction.options.get("category")?.channel,
        maxtickets: interaction.options.get("maxticketsperuser")?.value as number,
        supportping: interaction.options.get("supportrole")?.role as Role
    };
    if (options.enabled !== null || options.category || options.maxtickets || options.supportping) {
        if (options.category) {
            let channel: GuildChannel | null;
            try {
                channel = await interaction.guild.channels.fetch(options.category.id) as GuildChannel;
            } catch {
                return await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("CHANNEL.TEXT.DELETE")
                            .setTitle("Tickets > Category")
                            .setDescription("The channel you provided is not a valid category")
                            .setStatus("Danger")
                    ]
                });
            }
            if (!channel) return;
            channel = channel as Discord.CategoryChannel;
            if (channel.guild.id !== interaction.guild.id)
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Tickets > Category")
                            .setDescription("You must choose a category in this server")
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
                            .setDescription("You must choose a number greater than 0")
                            .setStatus("Danger")
                            .setEmoji("CHANNEL.TEXT.DELETE")
                    ]
                });
        }
        let role: Role | null;
        if (options.supportping) {
            try {
                role = await interaction.guild.roles.fetch(options.supportping.id);
            } catch {
                return await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("GUILD.ROLE.DELETE")
                            .setTitle("Tickets > Support Ping")
                            .setDescription("The role you provided is not a valid role")
                            .setStatus("Danger")
                    ]
                });
            }
            if (!role) return;
            role = role as Discord.Role;
            if (role.guild.id !== interaction.guild.id)
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Tickets > Support Ping")
                            .setDescription("You must choose a role in this server")
                            .setStatus("Danger")
                            .setEmoji("GUILD.ROLE.DELETE")
                    ]
                });
        }

        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.TICKET.ARCHIVED")
            .setTitle("Tickets")
            .setDescription(
                (options.category ? `**Category:** ${options.category.name}\n` : "") +
                    (options.maxtickets ? `**Max Tickets:** ${options.maxtickets}\n` : "") +
                    (options.supportping ? `**Support Ping:** ${options.supportping.name}\n` : "") +
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
            .setFailedMessage("Cancelled", "Warning", "GUILD.TICKET.CLOSE") // TODO: Set Actual Message
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            const toUpdate: Record<string, string | boolean | number> = {};
            if (options.enabled !== null) toUpdate["tickets.enabled"] = options.enabled;
            if (options.category) toUpdate["tickets.category"] = options.category.id;
            if (options.maxtickets) toUpdate["tickets.maxTickets"] = options.maxtickets;
            if (options.supportping) toUpdate["tickets.supportRole"] = options.supportping.id;
            try {
                await client.database.guilds.write(interaction.guild.id, toUpdate);
            } catch (e) {
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Tickets")
                            .setDescription("Something went wrong and the staff notifications channel could not be set")
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
        (value: string, index: number, array: string[]) => array.indexOf(value) === index
    );
    let lastClicked = "";
    let embed: EmojiEmbed = new EmojiEmbed();
    let compiledData = {
        enabled: data.tickets.enabled,
        category: data.tickets.category,
        maxTickets: data.tickets.maxTickets,
        supportRole: data.tickets.supportRole,
        useCustom: data.tickets.useCustom,
        types: data.tickets.types,
        customTypes: data.tickets.customTypes
    };
    let timedOut = false;
    while (!timedOut) {
            embed
            .setTitle("Tickets")
            .setDescription(
                `${compiledData.enabled ? "" : getEmojiByName("TICKETS.REPORT")} **Enabled:** ${
                    compiledData.enabled ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`
                }\n` +
                    `${compiledData.category ? "" : getEmojiByName("TICKETS.REPORT")} **Category:** ${
                        compiledData.category ? `<#${compiledData.category}>` : "*None set*"
                    }\n` +
                    `**Max Tickets:** ${compiledData.maxTickets ? compiledData.maxTickets : "*No limit*"}\n` +
                    `**Support Ping:** ${compiledData.supportRole ? `<@&${compiledData.supportRole}>` : "*None set*"}\n\n` +
                    (compiledData.useCustom && compiledData.customTypes === null ? `${getEmojiByName("TICKETS.REPORT")} ` : "") +
                    `${compiledData.useCustom ? "Custom" : "Default"} types in use` +
                    "\n\n" +
                    `${getEmojiByName("TICKETS.REPORT")} *Indicates a setting stopping tickets from being used*`
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN");
        m = (await interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel("Tickets " + (compiledData.enabled ? "enabled" : "disabled"))
                        .setEmoji(getEmojiByName("CONTROL." + (compiledData.enabled ? "TICK" : "CROSS"), "id"))
                        .setStyle(compiledData.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setCustomId("enabled"),
                    new ButtonBuilder()
                        .setLabel(lastClicked === "cat" ? "Click again to confirm" : "Clear category")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId("clearCategory")
                        .setDisabled(compiledData.category === null),
                    new ButtonBuilder()
                        .setLabel(lastClicked === "max" ? "Click again to confirm" : "Reset max tickets")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId("clearMaxTickets")
                        .setDisabled(compiledData.maxTickets === 5),
                    new ButtonBuilder()
                        .setLabel(lastClicked === "sup" ? "Click again to confirm" : "Clear support ping")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId("clearSupportPing")
                        .setDisabled(compiledData.supportRole === null)
                ]),
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel("Manage types")
                        .setEmoji(getEmojiByName("TICKETS.OTHER", "id"))
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("manageTypes"),
                    new ButtonBuilder()
                        .setLabel("Add create ticket button")
                        .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("send")
                ])
            ]
        })) as Message;
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        i.deferUpdate();
        if ((i.component as ButtonComponent).customId === "clearCategory") {
            if (lastClicked === "cat") {
                lastClicked = "";
                await client.database.guilds.write(interaction.guild.id, null, ["tickets.category"]);
                compiledData.category = null;
            } else lastClicked = "cat";
        } else if ((i.component as ButtonComponent).customId === "clearMaxTickets") {
            if (lastClicked === "max") {
                lastClicked = "";
                await client.database.guilds.write(interaction.guild.id, null, ["tickets.maxTickets"]);
                compiledData.maxTickets = 5;
            } else lastClicked = "max";
        } else if ((i.component as ButtonComponent).customId === "clearSupportPing") {
            if (lastClicked === "sup") {
                lastClicked = "";
                await client.database.guilds.write(interaction.guild.id, null, ["tickets.supportRole"]);
                compiledData.supportRole = null;
            } else lastClicked = "sup";
        } else if ((i.component as ButtonComponent).customId === "send") {
            const ticketMessages = [
                {
                    label: "Create ticket",
                    description: "Click the button below to create a ticket"
                },
                {
                    label: "Issues, questions or feedback?",
                    description: "Click below to open a ticket and get help from our staff team"
                },
                {
                    label: "Contact Us",
                    description: "Click the button below to speak to us privately"
                }
            ];
            let innerTimedOut = false;
            let templateSelected = false;
            while (!innerTimedOut && !templateSelected) {
                const enabled = compiledData.enabled && compiledData.category !== null;
                await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Ticket Button")
                            .setDescription("Select a message template to send in this channel")
                            .setFooter({
                                text: enabled
                                    ? ""
                                    : "Tickets are not set up correctly so the button may not work for users. Check the main menu to find which options must be set."
                            })
                            .setStatus(enabled ? "Success" : "Warning")
                            .setEmoji("GUILD.ROLES.CREATE")
                    ],
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
                            new StringSelectMenuBuilder()
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
                        new ActionRowBuilder<ButtonBuilder>().addComponents([
                            new ButtonBuilder()
                                .setCustomId("back")
                                .setLabel("Back")
                                .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId("blank").setLabel("Empty").setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("custom")
                                .setLabel("Custom")
                                .setEmoji(getEmojiByName("TICKETS.OTHER", "id"))
                                .setStyle(ButtonStyle.Primary)
                        ])
                    ]
                });
                let i: MessageComponentInteraction;
                try {
                    i = await m.awaitMessageComponent({
                        time: 300000,
                        filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
                    });
                } catch (e) {
                    innerTimedOut = true;
                    continue;
                }
                if ((i.component as StringSelectMenuComponent).customId === "template") {
                    i.deferUpdate();
                    await interaction.channel!.send({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle(ticketMessages[parseInt((i as StringSelectMenuInteraction).values[0]!)]!.label)
                                .setDescription(
                                    ticketMessages[parseInt((i as StringSelectMenuInteraction).values[0]!)]!.description
                                )
                                .setStatus("Success")
                                .setEmoji("GUILD.TICKET.OPEN")
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents([
                                new ButtonBuilder()
                                    .setLabel("Create Ticket")
                                    .setEmoji(getEmojiByName("CONTROL.TICK", "id"))
                                    .setStyle(ButtonStyle.Success)
                                    .setCustomId("createticket")
                            ])
                        ]
                    });
                    templateSelected = true;
                    continue;
                } else if ((i.component as ButtonComponent).customId === "blank") {
                    i.deferUpdate();
                    await interaction.channel!.send({
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents([
                                new ButtonBuilder()
                                    .setLabel("Create Ticket")
                                    .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
                                    .setStyle(ButtonStyle.Success)
                                    .setCustomId("createticket")
                            ])
                        ]
                    });
                    templateSelected = true;
                    continue;
                } else if ((i.component as ButtonComponent).customId === "custom") {
                    await i.showModal(
                        new Discord.ModalBuilder()
                            .setCustomId("modal")
                            .setTitle("Enter embed details")
                            .addComponents(
                                new ActionRowBuilder<TextInputBuilder>().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("title")
                                        .setLabel("Title")
                                        .setMaxLength(256)
                                        .setRequired(true)
                                        .setStyle(Discord.TextInputStyle.Short)
                                ),
                                new ActionRowBuilder<TextInputBuilder>().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("description")
                                        .setLabel("Description")
                                        .setMaxLength(4000)
                                        .setRequired(true)
                                        .setStyle(Discord.TextInputStyle.Paragraph)
                                )
                            )
                    );
                    await interaction.editReply({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle("Ticket Button")
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
                        out = await modalInteractionCollector(
                            m,
                            (m) => m.channel!.id === interaction.channel!.id,
                            (m) => m.customId === "modify"
                        );
                    } catch (e) {
                        innerTimedOut = true;
                        continue;
                    }
                    out = out as ModalSubmitInteraction;
                    if (out.fields) {
                        const title = out.fields.getTextInputValue("title");
                        const description = out.fields.getTextInputValue("description");
                        await interaction.channel!.send({
                            embeds: [
                                new EmojiEmbed()
                                    .setTitle(title)
                                    .setDescription(description)
                                    .setStatus("Success")
                                    .setEmoji("GUILD.TICKET.OPEN")
                            ],
                            components: [
                                new ActionRowBuilder<ButtonBuilder>().addComponents([
                                    new ButtonBuilder()
                                        .setLabel("Create Ticket")
                                        .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
                                        .setStyle(ButtonStyle.Success)
                                        .setCustomId("createticket")
                                ])
                            ]
                        });
                        templateSelected = true;
                    }
                }
            }
        } else if ((i.component as ButtonComponent).customId === "enabled") {
            await client.database.guilds.write(interaction.guild.id, {
                "tickets.enabled": !compiledData.enabled
            });
            compiledData.enabled = !compiledData.enabled;
        } else if ((i.component as ButtonComponent).customId === "manageTypes") {
            data = await manageTypes(interaction, data, m as Message); //TODO: Fix this
        }
    }
    await interaction.editReply({
        embeds: [ embed.setFooter({ text: "Message timed out" })],
        components: []
    });
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
                components: (customTypes
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
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        if ((i.component as StringSelectMenuComponent).customId === "types") {
            i.deferUpdate();
            const types = toHexInteger((i as StringSelectMenuInteraction).values, ticketTypes);
            await client.database.guilds.write(interaction.guild!.id, {
                "tickets.types": types
            });
            data.types = types;
        } else if ((i.component as StringSelectMenuComponent).customId === "removeTypes") {
            i.deferUpdate();
            const types = (i as StringSelectMenuInteraction).values;
            let customTypes = data.customTypes;
            if (customTypes) {
                customTypes = customTypes.filter((t) => !types.includes(t));
                customTypes = customTypes.length > 0 ? customTypes : null;
                await client.database.guilds.write(interaction.guild!.id, {
                    "tickets.customTypes": customTypes
                });
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
            await interaction.editReply({
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
                out = await modalInteractionCollector(
                    m,
                    (m) => m.channel!.id === interaction.channel!.id,
                    (m) => m.customId === "addType"
                );
            } catch (e) {
                continue;
            }
            out = out as ModalSubmitInteraction;
            if (out.fields) {
                let toAdd = out.fields.getTextInputValue("type");
                if (!toAdd) {
                    continue;
                }
                toAdd = toAdd.substring(0, 80);
                try {
                    await client.database.guilds.append(interaction.guild!.id, "tickets.customTypes", toAdd);
                } catch {
                    continue;
                }
                data.customTypes = data.customTypes ?? [];
                if (!data.customTypes.includes(toAdd)) {
                    data.customTypes.push(toAdd);
                }
            } else {
                continue;
            }
        } else if ((i.component as ButtonComponent).customId === "switchToDefault") {
            i.deferUpdate();
            await client.database.guilds.write(interaction.guild!.id, { "tickets.useCustom": false }, []);
            data.useCustom = false;
        } else if ((i.component as ButtonComponent).customId === "switchToCustom") {
            i.deferUpdate();
            await client.database.guilds.write(interaction.guild!.id, { "tickets.useCustom": true }, []);
            data.useCustom = true;
        } else {
            i.deferUpdate();
            backPressed = true;
        }
    }
    return data;
}

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
