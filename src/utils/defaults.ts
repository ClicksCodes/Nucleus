import type Discord from "discord.js";
import EmojiEmbed from "./generateEmojiEmbed.js";
import getEmojiByName from "./getEmojiByName.js";

export const LoadingEmbed = [
    new EmojiEmbed().setDescription(`${getEmojiByName("NUCLEUS.LOADING")} One moment...`).setStatus("Danger")
];

export const LinkWarningFooter = {
    text: "The button below will take you to a website set by the server moderators. Do not enter any passwords unless it is from a trusted website.",
    iconURL: "https://cdn.discordapp.com/emojis/952295894370369587.webp?size=128&quality=lossless"
};

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

export const imageDataEasterEgg =
    "The image in this embed contains data about the below log.\n" +
    "It isn't designed to be read by humans, but you can decode it with any base64 decoder, and then read it as JSON.\n" +
    "We use base 64 to get around people using virus tests and the file being blocked, and an image to have the embed hidden (files can't be suppressed)\n" +
    "If you've got to this point and are reading this hidden message, you should come and work with us " +
    "at https://discord.gg/w35pXdrxKW (Internal development server) and let us know how you got here!";
