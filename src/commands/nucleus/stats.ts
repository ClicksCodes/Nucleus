import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("stats")
    .setDescription("Gets the bot's stats")

const callback = (interaction: CommandInteraction) => {
    interaction.reply({
        embeds: [new generateEmojiEmbed()
            .setTitle("Stats")
            .setDescription(
                `**Servers:** ${interaction.client.guilds.cache.size}\n` +
                `**Ping:** \`${interaction.client.ws.ping*2}ms\``
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