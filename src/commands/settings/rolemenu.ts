import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("rolemenu")
    .setDescription("rolemenu")// TODO
    .addRoleOption(option => option.setName("role").setDescription("The role to give after verifying")) // TODO

const callback = async (interaction: CommandInteraction): Promise<any> => {
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as Discord.GuildMember)
    if (!member.permissions.has("MANAGE_ROLES")) throw "You must have the *Manage Roles* permission to use this command"
    return true;
}

export { command };
export { callback };
export { check };