import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";
import { SelectMenuOption } from '@discordjs/builders';
import getEmojiByName from "../../utils/getEmojiByName.js";
import createPageIndicator from "../../utils/createPageIndicator.js";


class Embed {
    embed: Discord.MessageEmbed;
    title: string;
    description: string = "";
    pageId: number = 0;
    setEmbed(embed: Discord.MessageEmbed) { this.embed = embed; return this; }
    setTitle(title: string) { this.title = title; return this; }
    setDescription(description: string) { this.description = description; return this; }
    setPageId(pageId: number) { this.pageId = pageId; return this; }
}

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("list")
        .setDescription("Lists all tags in the server")

const callback = async (interaction: CommandInteraction) => {
    let data = await client.database.read(interaction.guild.id);
    let tags = data.getKey("tags");
    console.log(tags)
    let strings = []
    if (data === {}) strings = ["*No tags exist*"]
    else {
        let string = ""
        for (let tag in tags) {
            let proposed = `**${tag}:** ${tags[tag]}\n`
            if (string.length + proposed.length > 2000) {
                strings.push(string.slice(0, -1))
                string = ""
            }
            console.log(string)
            string += proposed
        }
        strings.push(string.slice(0, -1))
    }

    let pages = []
    for (let string of strings) {
        pages.push(new Embed()
            .setEmbed(new generateEmojiEmbed()
                .setTitle("Tags")
                .setDescription(string)
                .setEmoji("PUNISH.NICKNAME.GREEN")
                .setStatus("Success")
            ).setTitle(`Page ${pages.length + 1}`).setPageId(pages.length))
    }
    let m;
    m = await interaction.reply({
        embeds: [
            new generateEmojiEmbed()
                .setTitle("Welcome")
                .setDescription(`One moment...`)
                .setStatus("Danger")
                .setEmoji("NUCLEUS.LOADING")
        ], fetchReply: true, ephemeral: true
    });
    let page = 0;
    let selectPaneOpen = false;
    while (true) {
        let selectPane = []

        if (selectPaneOpen) {
            let options = [];
            pages.forEach(embed => {
                options.push(new SelectMenuOption({
                    label: embed.title,
                    value: embed.pageId.toString(),
                    description: embed.description || "",
                }))
            })
            selectPane = [new MessageActionRow().addComponents([
                new Discord.MessageSelectMenu()
                    .addOptions(options)
                    .setCustomId("page")
                    .setMaxValues(1)
                    .setPlaceholder("Choose a page...")
            ])]
        }
        let em = new Discord.MessageEmbed(pages[page].embed)
        em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page));
        await interaction.editReply({
            embeds: [em],
            components: selectPane.concat([new MessageActionRow().addComponents([
                new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(page === 0),
                new MessageButton().setCustomId("select").setEmoji(getEmojiByName("CONTROL.MENU", "id")).setStyle(selectPaneOpen ? "PRIMARY" : "SECONDARY").setDisabled(false),
                new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(page === pages.length - 1),
                new MessageButton().setCustomId("close").setEmoji(getEmojiByName("CONTROL.CROSS", "id")).setStyle("DANGER")
            ])])
        });
        let i
        try {
            i = await m.awaitMessageComponent({time: 600000 });
        } catch (e) { break }
        i.deferUpdate()
        if (i.component.customId == "left") {
            if (page > 0) page--;
            selectPaneOpen = false;
        } else if (i.component.customId == "right") {
            if (page < pages.length - 1) page++;
            selectPaneOpen = false;
        } else if (i.component.customId == "select") {
            selectPaneOpen = !selectPaneOpen;
        } else if (i.component.customId == "page") {
            page = parseInt(i.values[0]);
            selectPaneOpen = false;
        } else {
            let em = new Discord.MessageEmbed(pages[page].embed)
            em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page) + " | Message closed");
            await interaction.editReply({
                embeds: [em], components: [new MessageActionRow().addComponents([
                    new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(true),
                    new MessageButton().setCustomId("select").setEmoji(getEmojiByName("CONTROL.MENU", "id")).setStyle(selectPaneOpen ? "PRIMARY" : "SECONDARY").setDisabled(true),
                    new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(true),
                    new MessageButton().setCustomId("close").setEmoji(getEmojiByName("CONTROL.CROSS", "id")).setStyle("DANGER").setDisabled(true)
                ])]
            })
            return;
        }
    }
    let em = new Discord.MessageEmbed(pages[page])
    em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page) + " | Message timed out");
    await interaction.editReply({
        embeds: [em],
        components: [new MessageActionRow().addComponents([
            new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(true),
            new MessageButton().setCustomId("select").setEmoji(getEmojiByName("CONTROL.MENU", "id")).setStyle("SECONDARY").setDisabled(true),
            new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(true),
            new MessageButton().setCustomId("close").setEmoji(getEmojiByName("CONTROL.CROSS", "id")).setStyle("DANGER").setDisabled(true)
        ])]
    });
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };