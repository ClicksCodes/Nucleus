import { LoadingEmbed } from "../../utils/defaults.js";
import type { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("ping").setDescription("Gets the bot's ping time");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    // WEBSOCKET | Nucleus -> Discord
    // EDITING   | Nucleus -> discord -> nucleus | edit time / 2
    const initial = Date.now();
    await interaction.reply({ embeds: LoadingEmbed, ephemeral: true });
    const ping = Date.now() - initial;
    interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Ping")
                .setDescription(
                    `**Ping:** \`${ping}ms\`\n` +
                        `**To Discord:** \`${client.ws.ping}ms\`\n` +
                        `**From Expected:** \`±${Math.abs(ping / 2 - client.ws.ping)}ms\``
                )
                .setEmoji("CHANNEL.SLOWMODE.OFF")
                .setStatus("Danger")
        ]
    });
};

export { command };
export { callback };
