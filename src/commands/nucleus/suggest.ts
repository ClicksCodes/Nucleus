import Discord, { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("suggest")
        .setDescription("Sends a suggestion to the developers")
        .addStringOption((option) =>
            option.setName("suggestion").setDescription("The suggestion to send").setRequired(true)
        );

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const { renderUser } = client.logger;
    const suggestion = interaction.options.getString("suggestion");
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("ICONS.OPP.ADD")
        .setTitle("Suggest")
        .setDescription(
            `**Suggestion:**\n> ${suggestion}\n` +
                "Your username and ID will also be sent with your suggestion.\n\nAre you sure you want to send this suggestion?"
        )
        .setColor("Danger")
        .setInverted(true)
        .send();
    if (confirmation.cancelled) return;
    if (confirmation.success) {
        await (client.channels.cache.get("955161206459600976") as Discord.TextChannel).send({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Suggestion")
                    .setDescription(
                        `**From:** ${renderUser(interaction.member.user)}\n**Suggestion:**\n> ${suggestion}`
                    )
                    .setStatus("Danger")
                    .setEmoji("NUCLEUS.LOGO")
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
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("ICONS.OPP.ADD")
                    .setTitle("Suggest")
                    .setDescription("No changes were made")
                    .setStatus("Danger")
            ],
            components: []
        });
    }
};

const check = (_interaction: CommandInteraction) => {
    return true;
};

export { command };
export { callback };
export { check };
