import { AutocompleteInteraction, CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../utils/client.js"
import EmojiEmbed from "../utils/generateEmojiEmbed.js";

const command = new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Get and manage the servers tags")
    .addStringOption(o => o.setName("tag").setDescription("The tag to get").setAutocomplete(true).setRequired(true))

const callback = async (interaction: CommandInteraction) => {
    const config = await client.database.guilds.read(interaction.guild.id)
    const tags = config.getKey("tags")
    const tag = tags[interaction.options.getString("tag")]
    if (!tag) {
        return await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Tag")
            .setDescription(`Tag \`${interaction.options.getString("tag")}\` does not exist`)
            .setEmoji("PUNISH.NICKNAME.RED")
            .setStatus("Danger")
        ], ephemeral: true})
    }
    let url = ""
    let components = []
    if (tag.match(/^(http|https):\/\/[^ "]+$/)) {
        url = tag
        components = [new MessageActionRow().addComponents([new MessageButton()
            .setLabel("Open")
            .setURL(url)
            .setStyle("LINK")
        ])]
    }
    return await interaction.reply({embeds: [new EmojiEmbed()
        .setTitle(interaction.options.getString("tag"))
        .setDescription(tag)
        .setEmoji("PUNISH.NICKNAME.GREEN")
        .setStatus("Success")
        .setImage(url)
    ], components: components, ephemeral: true})

}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

const autocomplete = async (interaction: AutocompleteInteraction): Promise<string[]> => {
    if (!interaction.guild) return [];
    const config = await client.database.guilds.read(interaction.guild.id)
    const tags = Object.keys(config.getKey("tags"));
    return tags
}

export { command };
export { callback };
export { check };
export { autocomplete };
