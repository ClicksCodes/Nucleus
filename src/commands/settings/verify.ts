import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import Discord, {
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageActionRowComponent,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
    MessageSelectMenu,
    Role,
    SelectMenuInteraction,
    TextInputComponent
} from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import client from "../../utils/client.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("verify")
        .setDescription("Manage the role given after typing /verify")
        .addRoleOption((option) =>
            option
                .setName("role")
                .setDescription("The role to give after verifying")
                .setRequired(false)
        );

const callback = async (
    interaction: CommandInteraction
): Promise<void | unknown> => {
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Message;
    if (interaction.options.getRole("role")) {
        let role: Role;
        try {
            role = interaction.options.getRole("role") as Role;
        } catch {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("GUILD.ROLES.DELETE")
                        .setTitle("Verify Role")
                        .setDescription(
                            "The role you provided is not a valid role"
                        )
                        .setStatus("Danger")
                ]
            });
        }
        role = role as Discord.Role;
        if (role.guild.id !== interaction.guild.id) {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify Role")
                        .setDescription("You must choose a role in this server")
                        .setStatus("Danger")
                        .setEmoji("GUILD.ROLES.DELETE")
                ]
            });
        }
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.ROLES.EDIT")
            .setTitle("Verify Role")
            .setDescription(
                `Are you sure you want to set the verify role to <@&${role.id}>?`
            )
            .setColor("Warning")
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            try {
                await client.database.guilds.write(interaction.guild.id, {
                    "verify.role": role.id,
                    "verify.enabled": true
                });
                const { log, NucleusColors, entry, renderUser, renderRole } =
                    client.logger;
                const data = {
                    meta: {
                        type: "verifyRoleChanged",
                        displayName: "Verify Role Changed",
                        calculateType: "nucleusSettingsUpdated",
                        color: NucleusColors.green,
                        emoji: "CONTROL.BLOCKTICK",
                        timestamp: new Date().getTime()
                    },
                    list: {
                        memberId: entry(
                            interaction.user.id,
                            `\`${interaction.user.id}\``
                        ),
                        changedBy: entry(
                            interaction.user.id,
                            renderUser(interaction.user)
                        ),
                        role: entry(role.id, renderRole(role))
                    },
                    hidden: {
                        guild: interaction.guild.id
                    }
                };
                log(data);
            } catch (e) {
                console.log(e);
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Verify Role")
                            .setDescription(
                                "Something went wrong while setting the verify role"
                            )
                            .setStatus("Danger")
                            .setEmoji("GUILD.ROLES.DELETE")
                    ],
                    components: []
                });
            }
        } else {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify Role")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                        .setEmoji("GUILD.ROLES.CREATE")
                ],
                components: []
            });
        }
    }
    let clicks = 0;
    const data = await client.database.guilds.read(interaction.guild.id);
    let role = data.verify.role;
    while (true) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify Role")
                    .setDescription(
                        role
                            ? `Your verify role is currently set to <@&${role}>`
                            : "You have not set a verify role"
                    )
                    .setStatus("Success")
                    .setEmoji("GUILD.ROLES.CREATE")
            ],
            components: [
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setCustomId("clear")
                        .setLabel(
                            clicks ? "Click again to confirm" : "Reset role"
                        )
                        .setEmoji(
                            getEmojiByName(
                                clicks ? "TICKETS.ISSUE" : "CONTROL.CROSS",
                                "id"
                            )
                        )
                        .setStyle("DANGER")
                        .setDisabled(!role),
                    new MessageButton()
                        .setCustomId("send")
                        .setLabel("Add verify button")
                        .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
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
        i.deferUpdate();
        if ((i.component as MessageActionRowComponent).customId === "clear") {
            clicks += 1;
            if (clicks === 2) {
                clicks = 0;
                await client.database.guilds.write(interaction.guild.id, null, [
                    "verify.role",
                    "verify.enabled"
                ]);
                role = undefined;
            }
        } else if (
            (i.component as MessageActionRowComponent).customId === "send"
        ) {
            const verifyMessages = [
                {
                    label: "Verify",
                    description: "Click the button below to get verified"
                },
                {
                    label: "Get verified",
                    description:
                        "To get access to the rest of the server, click the button below"
                },
                {
                    label: "Ready to verify?",
                    description: "Click the button below to verify yourself"
                }
            ];
            while (true) {
                await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Verify Button")
                            .setDescription(
                                "Select a message template to send in this channel"
                            )
                            .setFooter({
                                text: role
                                    ? ""
                                    : "You do no have a verify role set so the button will not work."
                            })
                            .setStatus(role ? "Success" : "Warning")
                            .setEmoji("GUILD.ROLES.CREATE")
                    ],
                    components: [
                        new MessageActionRow().addComponents([
                            new MessageSelectMenu()
                                .setOptions(
                                    verifyMessages.map(
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
                                    verifyMessages[
                                        parseInt(
                                            (i as SelectMenuInteraction)
                                                .values[0]
                                        )
                                    ].label
                                )
                                .setDescription(
                                    verifyMessages[
                                        parseInt(
                                            (i as SelectMenuInteraction)
                                                .values[0]
                                        )
                                    ].description
                                )
                                .setStatus("Success")
                                .setEmoji("CONTROL.BLOCKTICK")
                        ],
                        components: [
                            new MessageActionRow().addComponents([
                                new MessageButton()
                                    .setLabel("Verify")
                                    .setEmoji(
                                        getEmojiByName("CONTROL.TICK", "id")
                                    )
                                    .setStyle("SUCCESS")
                                    .setCustomId("verifybutton")
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
                                    .setLabel("Verify")
                                    .setEmoji(
                                        getEmojiByName("CONTROL.TICK", "id")
                                    )
                                    .setStyle("SUCCESS")
                                    .setCustomId("verifybutton")
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
                                .setTitle("Verify Button")
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
                                    .setEmoji("CONTROL.BLOCKTICK")
                            ],
                            components: [
                                new MessageActionRow().addComponents([
                                    new MessageButton()
                                        .setLabel("Verify")
                                        .setEmoji(
                                            getEmojiByName("CONTROL.TICK", "id")
                                        )
                                        .setStyle("SUCCESS")
                                        .setCustomId("verifybutton")
                                ])
                            ]
                        });
                        break;
                    } else {
                        continue;
                    }
                }
            }
        } else {
            i.deferUpdate();
            break;
        }
    }
    await interaction.editReply({
        embeds: [m.embeds[0]!.setFooter({ text: "Message closed" })],
        components: []
    });
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_GUILD"))
        throw "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
