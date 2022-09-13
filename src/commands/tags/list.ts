import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import Discord, {
    CommandInteraction,
    Message,
    ActionRowBuilder,
    Component,
    ButtonBuilder,
    MessageComponentInteraction,
    EmbedBuilder,
    SelectMenuInteraction,
    MessageSelectOptionData,
    ButtonStyle
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import createPageIndicator from "../../utils/createPageIndicator.js";

class Embed {
    embed: Discord.EmbedBuilder = new EmbedBuilder();
    title: string = "";
    description = "";
    pageId = 0;
    setEmbed(embed: Discord.EmbedBuilder) {
        this.embed = embed;
        return this;
    }
    setTitle(title: string) {
        this.title = title;
        return this;
    }
    setDescription(description: string) {
        this.description = description;
        return this;
    }
    setPageId(pageId: number) {
        this.pageId = pageId;
        return this;
    }
}

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("list").setDescription("Lists all tags in the server");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const data = await client.database.guilds.read(interaction.guild!.id);
    const tags = data.getKey("tags");
    let strings = [];
    if (data === {}) strings = ["*No tags exist*"];
    else {
        let string = "";
        for (const tag in tags) {
            const proposed = `**${tag}:** ${tags[tag]}\n`;
            if (string.length + proposed.length > 2000) {
                strings.push(string.slice(0, -1));
                string = "";
            }
            string += proposed;
        }
        strings.push(string.slice(0, -1));
    }

    const pages = [];
    for (const string of strings) {
        pages.push(
            new Embed()
                .setEmbed(
                    new EmojiEmbed()
                        .setTitle("Tags")
                        .setDescription(string)
                        .setEmoji("PUNISH.NICKNAME.GREEN")
                        .setStatus("Success")
                )
                .setTitle(`Page ${pages.length + 1}`)
                .setPageId(pages.length)
        );
    }
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    })) as Message;
    let page = 0;
    let selectPaneOpen = false;
    let cancelled = false;
    let timedOut = false;
    while (!cancelled && !timedOut) {
        let selectPane: ActionRowBuilder[] = [];

        if (selectPaneOpen) {
            const options: MessageSelectOptionData[] = [];
            pages.forEach((embed) => {
                options.push({
                    label: embed.title,
                    value: embed.pageId.toString(),
                    description: embed.description || ""
                });
            });
            selectPane = [
                new ActionRowBuilder().addComponents([
                    new Discord.SelectMenuBuilder()
                        .addOptions(options)
                        .setCustomId("page")
                        .setMaxValues(1)
                        .setPlaceholder("Choose a page...")
                ])
            ];
        }
        const em = new Discord.EmbedBuilder(pages[page]!.embed);
        em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page));
        await interaction.editReply({
            embeds: [em],
            components: selectPane.concat([
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId("left")
                        .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId("select")
                        .setEmoji(getEmojiByName("CONTROL.MENU", "id"))
                        .setStyle(selectPaneOpen ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(false),
                    new ButtonBuilder()
                        .setCustomId("right")
                        .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === pages.length - 1),
                    new ButtonBuilder()
                        .setCustomId("close")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Danger)
                ])
            ])
        });
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            timedOut = true;
            continue;
        }
        i.deferUpdate();
        if ((i.component as Component).customId === "left") {
            if (page > 0) page--;
            selectPaneOpen = false;
        } else if ((i.component as Component).customId === "right") {
            if (page < pages.length - 1) page++;
            selectPaneOpen = false;
        } else if ((i.component as Component).customId === "select") {
            selectPaneOpen = !selectPaneOpen;
        } else if ((i.component as Component).customId === "page") {
            page = parseInt((i as SelectMenuInteraction).values[0]!);
            selectPaneOpen = false;
        } else {
            cancelled = true;
        }
    }
    const em = new Discord.EmbedBuilder(pages[page]!.embed);
    if (timedOut) {
        em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page) + " | Message timed out");
    } else {
        em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page) + " | Message closed");
    }
    await interaction.editReply({
        embeds: [em],
        components: []
    });
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
