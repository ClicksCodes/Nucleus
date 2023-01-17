import type { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("premium").setDescription("Information about Nucleus Premium");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    interaction.reply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Premium")
                .setDescription(
                    "*Nucleus Premium is currently not available.*\n\n" +
                        "Premium allows your server to get access to extra features, for a fixed price per month.\nThis includes:\n" +
                        "- Attachment logs - Stores attachments so they can be viewed after a message is deleted.\n" +
                        "- Ticket Transcripts - Gives a link to view the history of a ticket after it has been closed.\n"
                )
                .setEmoji("NUCLEUS.LOGO")
                .setStatus("Danger")
        ],
        ephemeral: true
    });
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
