import { CommandInteraction, GuildMember } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("nick")
    .setDescription("Changes a users nickname")
    .addUserOption(option => option.setName("user").setDescription("The user to change").setRequired(true))
    .addStringOption(option => option.setName("name").setDescription("The name to set").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when their nickname is changed | Default no").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )

const callback = async (interaction: CommandInteraction) => {
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command, callback, check };