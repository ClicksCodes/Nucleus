import EmojiEmbed from "./generateEmojiEmbed.js";
import getEmojiByName from "./getEmojiByName.js";

export const LoadingEmbed = [
    new EmojiEmbed().setDescription(`${getEmojiByName("NUCLEUS.LOADING")} One moment...`).setStatus("Danger")
];

export const LinkWarningFooter = {
    text: "The button below will take you to a website set by the server moderators. Do not enter any passwords unless it is from a trusted website.",
    iconURL: "https://cdn.discordapp.com/emojis/952295894370369587.webp?size=128&quality=lossless"
}