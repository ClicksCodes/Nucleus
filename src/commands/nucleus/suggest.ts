import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import config from "../../config/main.js";
import _ from "lodash";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("suggest").setDescription("Sends a suggestion to the developers");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await interaction.reply({ embeds: LoadingEmbed, ephemeral: true });
    let closed = false;
    let suggestionTitle: string | null = null;
    let suggestionDesc: string | null = null;
    do {
        const modal = new ModalBuilder()
            .setTitle("Suggestion")
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Suggestion Title")
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short)
                        .setCustomId("suggestionTitle")
                        .setPlaceholder("Summarize your suggestion in 1 sentence...")
                        .setMaxLength(256)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Suggestion Description")
                        .setCustomId("suggestionDesc")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setPlaceholder("Put the full details of your suggestion here...")
                        .setMinLength(50)
                )
            );
        const o: { suggestionDesc?: string; suggestionTitle?: string } = {};
        if (suggestionTitle) {
            o.suggestionTitle = suggestionTitle;
            modal.components[0]!.components[0]!.setValue(suggestionTitle);
        }
        if (suggestionDesc) {
            o.suggestionDesc = suggestionDesc;
            modal.components[1]!.components[0]!.setValue(suggestionDesc);
        }
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("ICONS.ADD")
            .setTitle("Suggest")
            .setDescription(
                suggestionDesc
                    ? `Are you sure you want to send this suggestion?\n\n**Title ${
                          suggestionTitle ? "" : "(*Placeholder*)"
                      }:**\n> ${
                          suggestionTitle ? suggestionTitle : `${suggestionDesc.substring(0, 70)}`
                      }\n\n**Suggestion:**\n> ${suggestionDesc}`
                    : "Please enter your suggestion below."
            )
            .addModal("Edit Suggestion", "ICONS.EDIT", "editSuggestion", _.cloneDeep(o), modal)
            .setColor("Success")
            .setInverted(true)
            .setFailedMessage("Your suggestion was deleted", "Success", "ICONS.ADD")
            .send(true);
        if (confirmation.modals?.[0] && !_.isEqual(confirmation.modals[0].values, o)) {
            suggestionTitle = confirmation.modals[0].values["suggestionTitle"] as string | null;
            suggestionDesc = confirmation.modals[0].values["suggestionDesc"] as string | null;
            continue;
        }
        if (confirmation.cancelled || confirmation.success === false) {
            closed = true;
            return;
        }
        if (confirmation.success) {
            closed = true;
        }
    } while (!closed);
    if (!suggestionDesc) return;
    suggestionTitle = suggestionTitle ? suggestionTitle : `${suggestionDesc.substring(0, 70)}`;
    const channel = client.channels.cache.get(config.suggestionChannel) as Discord.TextChannel;
    const m = await channel.send({ embeds: LoadingEmbed });
    let issueNumber: number | null = null;
    try {
        const issue = await client.GitHub.rest.issues.create({
            owner: "ClicksMinutePer",
            repo: "Nucleus",
            title: suggestionTitle,
            body: `Linked Suggestion in Private Developer Channel: [Message](${
                m.url
            })\n\n**Suggestion:**\n> ${suggestionDesc
                .replaceAll("@", "@<!-- -->")
                .replaceAll("/issues", "/issues<!-- -->")
                .replaceAll("/pull", "/pull<!-- -->")}\n\n`,
            labels: ["🤖 Auto", "📝 Suggestion"]
        });
        issueNumber = issue.data.number;
    } catch (_e) {
        console.log("Could not connect to GitHub");
    }
    const disabled = issueNumber ? false : true;
    await m.edit({
        embeds: [
            new EmojiEmbed()
                .setEmoji("ICONS.ADD")
                .setTitle(`Suggestion from ${interaction.user.tag} (${interaction.user.id})`)
                .setDescription(`**Suggestion:**\n> ${suggestionDesc}\n\n`)
                .setStatus("Success")
                .setFooter({ text: `${issueNumber ? issueNumber : "Could not connect to GitHub"}` })
        ],
        components: [
            new Discord.ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("accept:Suggestion")
                    .setLabel("Accept")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("deny:Suggestion")
                    .setLabel("Deny")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("close:Suggestion")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("implemented:Suggestion")
                    .setLabel("Implemented")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setLabel(`Open Issue #${issueNumber ? issueNumber : "0"}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://github.com/ClicksMinutePer/Nucleus/issues/${issueNumber}`)
                    .setDisabled(disabled)
            ),
            new Discord.ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("lock:Comment")
                    .setLabel("Lock")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("spam:Suggestion")
                    .setLabel("Mark as Spam")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled)
            )
        ]
    });
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setEmoji("ICONS.ADD")
                .setTitle("Suggest")
                .setDescription("Your suggestion was sent successfully")
                .setStatus("Success")
        ],
        components: []
    });
};

export { command };
export { callback };
