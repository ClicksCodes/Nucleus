import type { ButtonInteraction, ContextMenuCommandInteraction } from 'discord.js';
import type { CommandInteraction } from 'discord.js';
import type { NucleusClient } from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";

export const event = "commandError";

export async function callback(_: NucleusClient, interaction: CommandInteraction | ButtonInteraction | ContextMenuCommandInteraction, error: string) {
    const embed = new EmojiEmbed()
        .setTitle("Something went wrong")
        .setDescription(error)
        .setStatus("Danger")
        .setEmoji("CONTROL.BLOCKCROSS")
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
            embeds: [embed],
            ephemeral: true
        });
    } else {
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
}
