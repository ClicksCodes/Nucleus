import type Discord from "discord.js";
import EmojiEmbed from "./generateEmojiEmbed.js";
import getEmojiByName from "./getEmojiByName.js";

export const LoadingEmbed = [
    new EmojiEmbed().setDescription(`${getEmojiByName("NUCLEUS.LOADING")} One moment...`).setStatus("Danger")
];

export const LinkWarningFooter = {
    text: "The button below will take you to a website set by the server moderators. Do not enter any passwords unless it is from a trusted website.",
    iconURL: "https://cdn.discordapp.com/emojis/952295894370369587.webp?size=128&quality=lossless"
}

class Embed {
    embed: EmojiEmbed = new EmojiEmbed();
    title: string = "";
    description = "";
    pageId = 0;
    componentsToSet: Discord.ActionRowBuilder<Discord.ButtonBuilder | Discord.StringSelectMenuBuilder>[] = [];

    setEmbed(embed: EmojiEmbed) {
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
    setComponents(components: Discord.ActionRowBuilder<Discord.ButtonBuilder | Discord.StringSelectMenuBuilder>[]) {
        this.componentsToSet = components;
        return this;
    }
}

export { Embed };

export const unknownServerIcon = "";
