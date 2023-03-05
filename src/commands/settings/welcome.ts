import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    CommandInteraction,
    AutocompleteInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    APIMessageComponentEmoji,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    RoleSelectMenuInteraction,
    ChannelSelectMenuInteraction,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import convertCurlyBracketString from "../../utils/convertCurlyBracketString.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("welcome").setDescription("Messages and roles sent or given when someone joins the server");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const { renderChannel } = client.logger;
    const m = await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    });
    let closed = false;
    let config = await client.database.guilds.read(interaction.guild!.id);
    let data = Object.assign({}, config.welcome);
    do {
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("switch")
                .setLabel(data.enabled ? "Enabled" : "Disabled")
                .setStyle(data.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                .setEmoji(
                    getEmojiByName(data.enabled ? "CONTROL.TICK" : "CONTROL.CROSS", "id") as APIMessageComponentEmoji
                ),
            new ButtonBuilder()
                .setCustomId("message")
                .setLabel((data.message ? "Change" : "Set") + "Message")
                .setStyle(ButtonStyle.Primary)
                .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
            new ButtonBuilder()
                .setCustomId("channelDM")
                .setLabel("Send in DMs")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(data.channel === "dm"),
            new ButtonBuilder()
                .setCustomId("role")
                .setLabel("Clear Role")
                .setStyle(ButtonStyle.Danger)
                .setEmoji(getEmojiByName("CONTROL.CROSS", "id") as APIMessageComponentEmoji),
            new ButtonBuilder()
                .setCustomId("save")
                .setLabel("Save")
                .setStyle(ButtonStyle.Success)
                .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                .setDisabled(
                    data.enabled === config.welcome.enabled &&
                        data.message === config.welcome.message &&
                        data.role === config.welcome.role &&
                        data.ping === config.welcome.ping &&
                        data.channel === config.welcome.channel
                )
        );

        const channelMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setPlaceholder("Select a channel to send welcome messages to")
        );
        const roleMenu = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId("roleToGive")
                .setPlaceholder("Select a role to give to the member when they join the server")
        );
        const pingMenu = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId("roleToPing")
                .setPlaceholder("Select a role to ping when a member joins the server")
        );

        const embed = new EmojiEmbed()
            .setTitle("Welcome Settings")
            .setStatus("Success")
            .setDescription(
                `${getEmojiByName(data.enabled ? "CONTROL.TICK" : "CONTROL.CROSS")} Welcome messages and roles are ${
                    data.enabled ? "enabled" : "disabled"
                }\n` +
                    `**Welcome message:** ${
                        data.message
                            ? `\n> ` +
                              (await convertCurlyBracketString(
                                  data.message,
                                  interaction.user.id,
                                  interaction.user.username,
                                  interaction.guild!.name,
                                  interaction.guild!.members
                              ))
                            : "*None*"
                    }\n` +
                    `**Send message in:** ` +
                    (data.channel ? (data.channel == "dm" ? "DMs" : renderChannel(data.channel)) : `*None set*`) +
                    `\n` +
                    `**Role to ping:** ` +
                    (data.ping ? `<@&${data.ping}>` : `*None set*`) +
                    `\n` +
                    `**Role given on join:** ` +
                    (data.role ? `<@&${data.role}>` : `*None set*`)
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons, channelMenu, roleMenu, pingMenu]
        });

        let i: RoleSelectMenuInteraction | ChannelSelectMenuInteraction | ButtonInteraction;
        try {
            i = (await m.awaitMessageComponent({
                filter: (interaction) => interaction.user.id === interaction.user.id,
                time: 300000
            })) as RoleSelectMenuInteraction | ChannelSelectMenuInteraction | ButtonInteraction;
        } catch (e) {
            closed = true;
            continue;
        }

        if (i.isButton()) {
            switch (i.customId) {
                case "switch": {
                    await i.deferUpdate();
                    data.enabled = !data.enabled;
                    break;
                }
                case "message": {
                    const modal = new ModalBuilder()
                        .setCustomId("modal")
                        .setTitle("Welcome Message")
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
                                    .setStyle(TextInputStyle.Paragraph)
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
                                    .setStyle(TextInputStyle.Paragraph)
                            ),
                            new ActionRowBuilder<TextInputBuilder>().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("ex3")
                                    .setLabel("Member who joined (3/3) - {member:...}")
                                    .setPlaceholder(`{:name} - The members name\n`)
                                    .setMaxLength(1)
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                            ),
                            new ActionRowBuilder<TextInputBuilder>().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("message")
                                    .setPlaceholder("Enter a message to send when someone joins the server")
                                    .setValue(data.message ?? "")
                                    .setLabel("Message")
                                    .setStyle(TextInputStyle.Paragraph)
                            )
                        );
                    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId("back")
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
                    );
                    await i.showModal(modal);
                    await i.editReply({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle("Welcome Settings")
                                .setDescription("Modal opened. If you can't see it, click back and try again.")
                                .setStatus("Success")
                        ],
                        components: [button]
                    });

                    let out: ModalSubmitInteraction | null;
                    try {
                        out = (await modalInteractionCollector(m, interaction.user)) as ModalSubmitInteraction | null;
                    } catch (e) {
                        console.error(e);
                        out = null;
                    }
                    if (!out) break;
                    data.message = out.fields.getTextInputValue("message");
                    break;
                }
                case "save": {
                    await i.deferUpdate();
                    await client.database.guilds.write(interaction.guild!.id, { welcome: data });
                    config = await client.database.guilds.read(interaction.guild!.id);
                    data = Object.assign({}, config.welcome);
                    await client.memory.forceUpdate(interaction.guild!.id);
                    break;
                }
                case "channelDM": {
                    await i.deferUpdate();
                    data.channel = "dm";
                    break;
                }
                case "role": {
                    await i.deferUpdate();
                    data.role = null;
                    break;
                }
            }
        } else if (i.isRoleSelectMenu()) {
            await i.deferUpdate();
            switch (i.customId) {
                case "roleToGive": {
                    data.role = i.values[0]!;
                    break;
                }
                case "roleToPing": {
                    data.ping = i.values[0]!;
                    break;
                }
            }
        } else {
            await i.deferUpdate();
            data.channel = i.values[0]!;
        }
    } while (!closed);
    await interaction.deleteReply();
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

const autocomplete = async (interaction: AutocompleteInteraction): Promise<string[]> => {
    const validReplacements = ["serverName", "memberCount:all", "memberCount:bots", "memberCount:humans"];
    if (!interaction.guild) return [];
    const prompt = interaction.options.getString("message");
    const autocompletions = [];
    if (prompt === null) {
        for (const replacement of validReplacements) {
            autocompletions.push(`{${replacement}}`);
        }
        return autocompletions;
    }
    const beforeLastOpenBracket = prompt.match(/(.*){[^{}]{0,15}$/);
    const afterLastOpenBracket = prompt.match(/{[^{}]{0,15}$/);
    if (beforeLastOpenBracket !== null) {
        if (afterLastOpenBracket !== null) {
            for (const replacement of validReplacements) {
                if (replacement.startsWith(afterLastOpenBracket[0]!.slice(1))) {
                    autocompletions.push(`${beforeLastOpenBracket[1]}{${replacement}}`);
                }
            }
        } else {
            for (const replacement of validReplacements) {
                autocompletions.push(`${beforeLastOpenBracket[1]}{${replacement}}`);
            }
        }
    } else {
        for (const replacement of validReplacements) {
            autocompletions.push(`${prompt} {${replacement}}`);
        }
    }
    return autocompletions;
};

export { command, callback, check, autocomplete };
