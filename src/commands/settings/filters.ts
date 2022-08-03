import { LoadingEmbed } from './../../utils/defaultEmbeds.js';
import Discord, { CommandInteraction, MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from '../../utils/client.js';
import confirmationMessage from '../../utils/confirmationMessage.js';
import generateKeyValueList from '../../utils/generateKeyValueList.js';
import { ChannelType } from 'discord-api-types';
import getEmojiByName from '../../utils/getEmojiByName.js';

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("filter")
    .setDescription("Setting for message filters")

const callback = async (interaction: CommandInteraction): Promise<any> => {

}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as Discord.GuildMember)
    if (!member.permissions.has("MANAGE_MESSAGES")) throw "You must have the *Manage Messages* permission to use this command"
    return true;
}

export { command };
export { callback };
export { check };