import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import getEmojiByName from "../../utils/getEmojiByName.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import guide from "../../automations/guide.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("guide")
    .setDescription("Shows the welcome guide for the bot")


const callback = async (interaction) => {
    guide(interaction.guild, interaction)
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true
}

export { command };
export { callback };
export { check };
