import { CommandInteraction, MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";
import { SelectMenuComponent, SelectMenuOption, SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import generateEmojiEmbed from "../utils/generateEmojiEmbed.js";
import generateKeyValueList, { toCapitals } from "../utils/generateKeyValueList.js";
import getEmojiByName from "../utils/getEmojiByName.js";

const command = new SlashCommandBuilder()
    .setName("categorise")
    .setDescription("Categorises your servers channels")

const callback = async (interaction: CommandInteraction) => {
    // @ts-ignore
    const { renderChannel } = interaction.client.logger

    let channels = interaction.guild.channels.cache.filter(c => c.type !== "GUILD_CATEGORY");
    let categorised = {}

    await interaction.reply({embeds: [new generateEmojiEmbed()
        .setTitle("Loading...")
        .setEmoji("NUCLEUS.LOADING")
        .setStatus("Success")
    ], ephemeral: true});
    for (let c of channels.values()) {
        let predicted = []
        let types = {
            general: ["general"],
            commands: ["bot", "command", "music"],
            images: ["pic", "selfies", "image"],
            nsfw: ["porn", "nsfw", "sex"],
            links: ["links"],
            advertising: ["ads", "advert", "server", "partner"],
            staff: ["staff", "mod", "admin"]
        }

        for (let type in types) {
            for (let word of types[type]) {
                if (c.name.toLowerCase().includes(word)) {
                    predicted.push(type)
                }
            }
        }

        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setTitle("Categorise")
            .setDescription(generateKeyValueList({
                channel: renderChannel(c),
                category: c.parent ? c.parent.name : "Uncategorised"
            }) + "\n\n" + `Suggested tags: ${predicted.join(", ")}`)
            .setEmoji("CHANNEL.TEXT.CREATE")
            .setStatus("Success")
        ], components: [ new MessageActionRow().addComponents([
            new MessageButton()
                .setLabel("Use suggested")
                .setStyle("PRIMARY")
                .setCustomId("accept")
                .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
        ]), new MessageActionRow().addComponents([new MessageSelectMenu()
            .setPlaceholder("Select a category")
            .setCustomId("category")
            .setMinValues(0)
            .setMaxValues(1)
            .setOptions(Object.keys(types).map(type => {return {label: toCapitals(type), value: type}}))
        ])]});
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };