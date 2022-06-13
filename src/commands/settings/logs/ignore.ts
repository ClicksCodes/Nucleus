import { ChannelType } from 'discord-api-types';
import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import generateEmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from '../../../utils/confirmationMessage.js';
import keyValueList from '../../../utils/generateKeyValueList.js';
import client from '../../../utils/client.js';

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("ignore")
    .setDescription("Sets which users, channels and roles should be ignored")
    .addStringOption(o => o.setName("action").setDescription("Add or remove from the list").addChoices([
        ["Add", "add"], ["Remove", "remove"]
    ]).setRequired(true))
    .addChannelOption(o => o.setName("addchannel").setDescription("Add a channel that should be ignored").addChannelTypes([
        ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildNews, ChannelType.GuildPublicThread, ChannelType.GuildPrivateThread, ChannelType.GuildNewsThread
    ]))
    .addUserOption(o => o.setName("adduser").setDescription("Add a user that should be ignored"))
    .addRoleOption(o => o.setName("addrole").setDescription("Add a role that should be ignored"))

const callback = async (interaction: CommandInteraction): Promise<any> => {
    let channel = interaction.options.getChannel("addchannel")
    let user = interaction.options.getUser("adduser")
    let role = interaction.options.getRole("addrole")
    await interaction.reply({embeds: [new generateEmojiEmbed()
        .setTitle("Loading")
        .setStatus("Danger")
        .setEmoji("NUCLEUS.LOADING")
    ], ephemeral: true, fetchReply: true});
    if (channel || user || role) {
        if (channel) {
            try {
                channel = interaction.guild.channels.cache.get(channel.id)
            } catch {
                return await interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setEmoji("CHANNEL.TEXT.DELETE")
                    .setTitle("Logs > Ignore")
                    .setDescription("The channel you provided is not a valid channel")
                    .setStatus("Danger")
                ]})
            }
            channel = channel as Discord.TextChannel
            if (channel.guild.id != interaction.guild.id) {
                return interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setTitle("Logs > Ignore")
                    .setDescription(`You must choose a channel in this server`)
                    .setStatus("Danger")
                    .setEmoji("CHANNEL.TEXT.DELETE")
                ]});
            }
        }
        if (user) {
            try {
                user = interaction.guild.members.cache.get(user.id).user
            } catch {
                return await interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setEmoji("USER.DELETE")
                    .setTitle("Logs > Ignore")
                    .setDescription("The user you provided is not a valid user")
                    .setStatus("Danger")
                ]})
            }
            user = user as Discord.User
        }
        if (role) {
            try {
                role = interaction.guild.roles.cache.get(role.id)
            } catch {
                return await interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setEmoji("ROLE.DELETE")
                    .setTitle("Logs > Ignore")
                    .setDescription("The role you provided is not a valid role")
                    .setStatus("Danger")
                ]})
            }
            role = role as Discord.Role
            if (role.guild.id != interaction.guild.id) {
                return interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setTitle("Logs > Ignore")
                    .setDescription(`You must choose a role in this server`)
                    .setStatus("Danger")
                    .setEmoji("ROLE.DELETE")
                ]});
            }
        }
        let changes = {}
        if (channel) changes["channel"] = channel.id
        if (user) changes["user"] = user.id
        if (role) changes["role"] = role.id
        let confirmation = await new confirmationMessage(interaction)
            .setEmoji("NUCLEUS.COMMANDS.IGNORE")
            .setTitle("Logs > Ignore")
            .setDescription(keyValueList(changes)
            + `Are you sure you want to **${interaction.options.getString("action") == "add" ? "add" : "remove"}** these to the ignore list?`)
            .setColor("Warning")
        .send(true)
        if (confirmation.success) {
            let data = client.database.read(interaction.guild.id)
            if (channel) data.logging.logs.ignore.channels.concat([channel.id])
            if (user) data.logging.logs.ignore.users.concat([user.id])
            if (role) data.logging.logs.ignore.roles.concat([role.id])
            if (interaction.options.getString("action") == "add") {
                await client.database.append(interaction.guild.id, data)
            }
        }
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as Discord.GuildMember)
    if (!member.permissions.has("MANAGE_GUILD")) throw "You must have the `manage_server` permission to use this command"
    return true;
}

export { command };
export { callback };
export { check };