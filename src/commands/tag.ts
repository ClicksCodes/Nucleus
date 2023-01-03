import { AutocompleteInteraction, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import client from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import { capitalize } from "../utils/generateKeyValueList.js";
import { getResults } from "../utils/search.js";

const command = new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Get and manage the servers tags")
    .addStringOption((o) => o.setName("tag").setDescription("The tag to get").setAutocomplete(true).setRequired(true));

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const config = await client.database.guilds.read(interaction.guild!.id);
    const tags = config.tags;
    const search = interaction.options.get("tag")?.value as string;
    const tag = tags[search];
    if (!tag) {
        await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag")
                    .setDescription(`Tag \`${search}\` does not exist`)
                    .setEmoji("PUNISH.NICKNAME.RED")
                    .setStatus("Danger")
            ],
            ephemeral: true
        });
        return;
    }
    let url = "";
    let components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (tag.match(/^(http|https):\/\/[^ "]+$/)) {
        url = tag;
        components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents([new ButtonBuilder().setLabel("Open").setURL(url).setStyle(ButtonStyle.Link)])
        ];
    }
    const em = new EmojiEmbed()
        .setTitle(capitalize(search))
        .setEmoji("PUNISH.NICKNAME.GREEN")
        .setStatus("Success")
    if (url) em.setImage(url)
    else em.setDescription(tag);

    await interaction.reply({
        embeds: [em],
        components: components,
        ephemeral: true
    });
    return;
};

const check = () => {
    return true;
};

const autocomplete = async (interaction: AutocompleteInteraction): Promise<string[]> => {
    if (!interaction.guild) return [];
    const prompt = interaction.options.getString("tag");
    console.log(prompt)
    const possible = Object.keys((await client.memory.readGuildInfo(interaction.guild.id)).tags);
    const results = getResults(prompt ?? "", possible);
    console.log(results)
    return results;
};

export { command };
export { callback };
export { check };
export { autocomplete };
