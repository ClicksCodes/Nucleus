import EmojiEmbed from "../utils/generateEmojiEmbed.js";

export const event = 'commandError'

export async function callback(client, interaction, error) {
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [new EmojiEmbed()
            .setTitle("Something went")
            .setDescription(error.message ?? error.toString())
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], ephemeral: true})
    } else {
        await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Something went wrong")
            .setDescription(error.message ?? error.toString())
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], ephemeral: true})
    }
}
