import EmojiEmbed from "./generateEmojiEmbed.js";
import getEmojiByName from "./getEmojiByName.js";

export const LoadingEmbed = [
    new EmojiEmbed().setDescription(`${getEmojiByName("NUCLEUS.LOADING")} One moment...`).setStatus("Danger")
];
