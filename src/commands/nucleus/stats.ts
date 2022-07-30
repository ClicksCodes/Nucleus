import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js"

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("stats")
    .setDescription("Gets the bot's stats")

const callback = async (interaction: CommandInteraction): Promise<any> => {
    interaction.reply({
        embeds: [new EmojiEmbed()
            .setTitle("Stats")
            .setDescription(
                `**Servers:** ${client.guilds.cache.size}\n` +
                `**Ping:** \`${client.ws.ping*2}ms\``
            )
            .setStatus("Success")
            .setEmoji("GUILD.GRAPHS")

        ], ephemeral: true
    });
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };