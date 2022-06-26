import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import { WrappedCheck } from "jshaiku";
import client from "../../utils/client.js"

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("ping")
    .setDescription("Gets the bot's ping time")

const callback = async (interaction: CommandInteraction): Promise<any> => {
    // WEBSOCKET | Nucleus -> Discord
    // EDITING   | Nucleus -> discord -> nucleus | edit time / 2
    let initial = new Date().getTime();
    await interaction.reply({embeds: [new EmojiEmbed()
        .setTitle("Ping")
        .setDescription(`Checking ping times...`)
        .setEmoji("NUCLEUS.LOADING")
        .setStatus("Danger")
    ], ephemeral: true});
    let ping = new Date().getTime() - initial;
    interaction.editReply({embeds: [new EmojiEmbed()
        .setTitle("Ping")
        .setDescription(
            `**Ping:** \`${ping}ms\`\n` +
            `**To Discord:** \`${client.ws.ping}ms\`\n` +
            `**From Expected:** \`±${Math.abs((ping / 2) - client.ws.ping)}ms\``
        )
        .setEmoji("CHANNEL.SLOWMODE.OFF")
        .setStatus("Danger")
    ]})
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };