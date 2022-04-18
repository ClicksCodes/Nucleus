import { MessageActionRow, MessageButton } from "discord.js";
import generateEmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import guide from "../automations/guide.js";

export const event = 'guildCreate';

export async function callback(client, guild) {
    guide(guild)
}
