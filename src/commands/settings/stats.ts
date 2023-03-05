import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    CommandInteraction,
    Message,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
    APIMessageComponentEmoji,
    TextInputBuilder,
    StringSelectMenuInteraction,
    ButtonInteraction,
    MessageComponentInteraction,
    ChannelSelectMenuBuilder,
    ChannelSelectMenuInteraction,
    ModalBuilder
} from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../utils/client.js";
import convertCurlyBracketString from "../../utils/convertCurlyBracketString.js";
import singleNotify from "../../utils/singleNotify.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import createPageIndicator from "../../utils/createPageIndicator.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("stats").setDescription("Controls channels which update when someone joins or leaves the server");

const showModal = async (interaction: MessageComponentInteraction, current: { enabled: boolean; name: string }) => {
    await interaction.showModal(
        new ModalBuilder()
            .setCustomId("modal")
            .setTitle(`Stats channel name`)
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("ex1")
                        .setLabel("Server Info (1/3)")
                        .setPlaceholder(
                            `{serverName} - This server's name\n\n` +
                                `These placeholders will be replaced with the server's name, etc..`
                        )
                        .setMaxLength(1)
                        .setRequired(false)
                        .setStyle(Discord.TextInputStyle.Paragraph)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("ex2")
                        .setLabel("Member Counts (2/3) - {MemberCount:...}")
                        .setPlaceholder(
                            `{:all} - Total member count\n` +
                                `{:humans} - Total non-bot users\n` +
                                `{:bots} - Number of bots\n`
                        )
                        .setMaxLength(1)
                        .setRequired(false)
                        .setStyle(Discord.TextInputStyle.Paragraph)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("ex3")
                        .setLabel("Latest Member (3/3) - {member:...}")
                        .setPlaceholder(`{:name} - The members name\n`)
                        .setMaxLength(1)
                        .setRequired(false)
                        .setStyle(Discord.TextInputStyle.Paragraph)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("text")
                        .setLabel("Channel name input")
                        .setMaxLength(1000)
                        .setRequired(true)
                        .setStyle(Discord.TextInputStyle.Short)
                        .setValue(current.name)
                )
            )
    );
};

type ObjectSchema = Record<string, { name: string; enabled: boolean }>;

const addStatsChannel = async (
    interaction: CommandInteraction,
    m: Message,
    currentObject: ObjectSchema
): Promise<ObjectSchema> => {
    let closed = false;
    let cancelled = false;
    const originalObject = Object.fromEntries(Object.entries(currentObject).map(([k, v]) => [k, { ...v }]));
    let newChannel: string | undefined;
    let newChannelName: string = "{memberCount:all}-members";
    let newChannelEnabled: boolean = true;
    do {
        m = await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Stats Channel")
                    .setDescription(
                        `New stats channel` +
                            (newChannel ? ` in <#${newChannel}>` : "") +
                            "\n\n" +
                            `**Name:** \`${newChannelName}\`\n` +
                            `**Preview:** ${await convertCurlyBracketString(
                                newChannelName,
                                interaction.user!.id,
                                interaction.user.username,
                                interaction.guild!.name,
                                interaction.guild!.members
                            )}\n` +
                            `**Enabled:** ${newChannelEnabled ? "Yes" : "No"}\n\n`
                    )
                    .setEmoji("SETTINGS.STATS.GREEN")
                    .setStatus("Success")
            ],
            components: [
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                    new ChannelSelectMenuBuilder().setCustomId("channel").setPlaceholder("Select a channel to use")
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel("Cancel")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId("back"),
                    new ButtonBuilder()
                        .setLabel("Save")
                        .setEmoji(getEmojiByName("ICONS.SAVE", "id"))
                        .setStyle(ButtonStyle.Success)
                        .setCustomId("save"),
                    new ButtonBuilder()
                        .setLabel("Edit name")
                        .setEmoji(getEmojiByName("ICONS.EDIT", "id"))
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("editName"),
                    new ButtonBuilder()
                        .setLabel(newChannelEnabled ? "Enabled" : "Disabled")
                        .setEmoji(getEmojiByName(newChannelEnabled ? "CONTROL.TICK" : "CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("toggleEnabled")
                )
            ]
        });
        let i: ButtonInteraction | ChannelSelectMenuInteraction;
        try {
            i = (await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => {
                    return (
                        i.user.id === interaction.user.id &&
                        i.channel!.id === interaction.channel!.id &&
                        i.message.id === m.id
                    );
                }
            })) as ButtonInteraction | ChannelSelectMenuInteraction;
        } catch (e) {
            closed = true;
            cancelled = true;
            break;
        }
        if (i.isButton()) {
            switch (i.customId) {
                case "back": {
                    await i.deferUpdate();
                    closed = true;
                    break;
                }
                case "save": {
                    await i.deferUpdate();
                    if (newChannel) {
                        currentObject[newChannel] = {
                            name: newChannelName,
                            enabled: newChannelEnabled
                        };
                    }
                    closed = true;
                    break;
                }
                case "editName": {
                    await interaction.editReply({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle("Stats Channel")
                                .setDescription("Modal opened. If you can't see it, click back and try again.")
                                .setStatus("Success")
                                .setEmoji("SETTINGS.STATS.GREEN")
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents(
                                new ButtonBuilder()
                                    .setLabel("Back")
                                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                    .setStyle(ButtonStyle.Primary)
                                    .setCustomId("back")
                            )
                        ]
                    });
                    showModal(i, { name: newChannelName, enabled: newChannelEnabled });

                    const out: Discord.ModalSubmitInteraction | ButtonInteraction | null =
                        await modalInteractionCollector(m, interaction.user);
                    if (!out) continue;
                    if (out.isButton()) continue;
                    newChannelName = out.fields.getTextInputValue("text");
                    break;
                }
                case "toggleEnabled": {
                    await i.deferUpdate();
                    newChannelEnabled = !newChannelEnabled;
                    break;
                }
            }
        } else {
            await i.deferUpdate();
            if (i.customId === "channel") {
                newChannel = i.values[0];
            }
        }
    } while (!closed);
    if (cancelled) return originalObject;
    if (!(newChannel && newChannelName && newChannelEnabled)) return originalObject;
    return currentObject;
};
const callback = async (interaction: CommandInteraction) => {
    if (!interaction.guild) return;
    const { renderChannel } = client.logger;
    const m: Message = await interaction.reply({ embeds: LoadingEmbed, ephemeral: true, fetchReply: true });
    let page = 0;
    let closed = false;
    const config = await client.database.guilds.read(interaction.guild.id);
    let currentObject: ObjectSchema = config.stats;
    let modified = false;
    do {
        const embed = new EmojiEmbed().setTitle("Stats Settings").setEmoji("SETTINGS.STATS.GREEN").setStatus("Success");
        const noStatsChannels = Object.keys(currentObject).length === 0;
        let current: { enabled: boolean; name: string };

        const pageSelect = new StringSelectMenuBuilder()
            .setCustomId("page")
            .setPlaceholder("Select a stats channel to manage");
        const actionSelect = new StringSelectMenuBuilder()
            .setCustomId("action")
            .setPlaceholder("Perform an action")
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel("Edit")
                    .setDescription("Edit the stats channel")
                    .setValue("edit")
                    .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Delete")
                    .setDescription("Delete the stats channel")
                    .setValue("delete")
                    .setEmoji(getEmojiByName("TICKETS.ISSUE", "id") as APIMessageComponentEmoji)
            );
        const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("back")
                .setStyle(ButtonStyle.Primary)
                .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId("next")
                .setEmoji(getEmojiByName("CONTROL.RIGHT", "id") as APIMessageComponentEmoji)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === Object.keys(currentObject).length - 1),
            new ButtonBuilder()
                .setCustomId("add")
                .setLabel("Create new")
                .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id") as APIMessageComponentEmoji)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(Object.keys(currentObject).length >= 24),
            new ButtonBuilder()
                .setCustomId("save")
                .setLabel("Save")
                .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(modified)
        );
        if (noStatsChannels) {
            embed.setDescription(
                "No stats channels have been set up yet. Use the button below to add one.\n\n" +
                    createPageIndicator(1, 1, undefined, true)
            );
            pageSelect.setDisabled(true);
            actionSelect.setDisabled(true);
            pageSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel("No stats channels").setValue("none"));
        } else {
            page = Math.min(page, Object.keys(currentObject).length - 1);
            current = currentObject[Object.keys(config.stats)[page]!]!;
            actionSelect.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(current.enabled ? "Disable" : "Enable")
                    .setValue("toggleEnabled")
                    .setDescription(
                        `Currently ${current.enabled ? "Enabled" : "Disabled"}, click to ${
                            current.enabled ? "disable" : "enable"
                        } this channel`
                    )
                    .setEmoji(
                        getEmojiByName(
                            current.enabled ? "CONTROL.TICK" : "CONTROL.CROSS",
                            "id"
                        ) as APIMessageComponentEmoji
                    )
            );
            embed.setDescription(
                `**Currently Editing:** ${renderChannel(Object.keys(currentObject)[page]!)}\n\n` +
                    `${getEmojiByName(current.enabled ? "CONTROL.TICK" : "CONTROL.CROSS")} Currently ${
                        current.enabled ? "Enabled" : "Disabled"
                    }\n` +
                    `**Name:** \`${current.name}\`\n` +
                    `**Preview:** ${await convertCurlyBracketString(
                        current.name,
                        interaction.user.id,
                        interaction.user.username,
                        interaction.guild.name,
                        interaction.guild.members
                    )}` +
                    "\n\n" +
                    createPageIndicator(Object.keys(config.stats).length, page)
            );
            for (const [id, { name, enabled }] of Object.entries(currentObject)) {
                pageSelect.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${name} (${renderChannel(id)})`)
                        .setEmoji(
                            getEmojiByName(enabled ? "CONTROL.TICK" : "CONTROL.CROSS", "id") as APIMessageComponentEmoji
                        )
                        .setDescription(`${enabled ? "Enabled" : "Disabled"}`)
                        .setValue(id)
                );
            }
        }

        interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(pageSelect),
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(actionSelect),
                buttonRow
            ]
        });

        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            i = (await m.awaitMessageComponent({
                filter: (interaction) => interaction.user.id === interaction.user.id,
                time: 60000
            })) as StringSelectMenuInteraction | ButtonInteraction;
        } catch (e) {
            closed = true;
            continue;
        }

        if (i.isStringSelectMenu()) {
            switch (i.customId) {
                case "page": {
                    await i.deferUpdate();
                    page = Object.keys(currentObject).indexOf(i.values[0]!);
                    break;
                }
                case "action": {
                    modified = true;
                    switch (i.values[0]!) {
                        case "edit": {
                            showModal(i, current!);
                            await interaction.editReply({
                                embeds: [
                                    new EmojiEmbed()
                                        .setTitle("Stats Channel")
                                        .setDescription("Modal opened. If you can't see it, click back and try again.")
                                        .setStatus("Success")
                                        .setEmoji("SETTINGS.STATS.GREEN")
                                ],
                                components: [
                                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                                        new ButtonBuilder()
                                            .setLabel("Back")
                                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                            .setStyle(ButtonStyle.Primary)
                                            .setCustomId("back")
                                    )
                                ]
                            });
                            let out: Discord.ModalSubmitInteraction | null;
                            try {
                                out = (await modalInteractionCollector(
                                    m,
                                    interaction.user
                                )) as Discord.ModalSubmitInteraction | null;
                            } catch (e) {
                                continue;
                            }
                            if (!out) continue;
                            if (out.isButton()) continue;
                            currentObject[Object.keys(currentObject)[page]!]!.name =
                                out.fields.getTextInputValue("text");
                            break;
                        }
                        case "toggleEnabled": {
                            await i.deferUpdate();
                            currentObject[Object.keys(currentObject)[page]!]!.enabled =
                                !currentObject[Object.keys(currentObject)[page]!]!.enabled;
                            modified = true;
                            break;
                        }
                        case "delete": {
                            await i.deferUpdate();
                            currentObject = Object.fromEntries(
                                Object.entries(currentObject).filter(([k]) => k !== Object.keys(currentObject)[page]!)
                            );
                            page = Math.min(page, Object.keys(currentObject).length - 1);
                            modified = true;
                            break;
                        }
                    }
                    break;
                }
            }
        } else {
            await i.deferUpdate();
            switch (i.customId) {
                case "back": {
                    page--;
                    break;
                }
                case "next": {
                    page++;
                    break;
                }
                case "add": {
                    currentObject = await addStatsChannel(interaction, m, currentObject);
                    page = Object.keys(currentObject).length - 1;
                    break;
                }
                case "save": {
                    await client.database.guilds.write(interaction.guild.id, { stats: currentObject });
                    singleNotify("statsChannelDeleted", interaction.guild.id, true);
                    modified = false;
                    await client.memory.forceUpdate(interaction.guild.id);
                    break;
                }
            }
        }
    } while (!closed);
    await interaction.deleteReply();
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageChannels"))
        return "You must have the *Manage Channels* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
