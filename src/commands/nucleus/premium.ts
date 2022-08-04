import { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("premium")
        .setDescription("Information about Nucleus Premium");

const callback = async (interaction: CommandInteraction): Promise<any> => {
    interaction.reply({embeds: [new EmojiEmbed()
        .setTitle("Premium")
        .setDescription(
            "*Nucleus Premium is currently not available.*\n\n" +
            "Premium allows your server to get access to extra features, for a fixed price per month.\nThis includes:\n" +
            "- Attachment logs - Stores attachments so they can be viewed after a message is deleted.\n" +
            "- Ticket Transcripts - Gives a link to view the history of a ticket after it has been closed.\n"
        )
        .setEmoji("NUCLEUS.LOGO")
        .setStatus("Danger")
    ], ephemeral: true});
};

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
};

export { command };
export { callback };
export { check };