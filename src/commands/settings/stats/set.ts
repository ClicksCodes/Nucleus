import { ChannelType } from 'discord-api-types';
import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../../utils/confirmationMessage.js";
import getEmojiByName from "../../../utils/getEmojiByName.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../../../utils/client.js";
import convertCurlyBracketString from '../../../utils/convertCurlyBracketString.js';
import {callback as statsChannelAddCallback} from "../../../reflex/statsChannelUpdate.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("set")
    .setDescription("Adds or edits a channel which will update when members join or leave")
    .addChannelOption(option => option.setName("channel").setDescription("The channel to modify").addChannelTypes([
        ChannelType.GuildNews, ChannelType.GuildText
    ]).setRequired(true))
    .addStringOption(option => option.setName("name").setDescription("The channel name").setRequired(true).setAutocomplete(true))

const callback = async (interaction: CommandInteraction): Promise<any> => {
    console.log(interaction.options.getString("name"))
    let m;
    m = await interaction.reply({embeds: [new EmojiEmbed()
        .setTitle("Loading")
        .setStatus("Danger")
        .setEmoji("NUCLEUS.LOADING")
    ], ephemeral: true, fetchReply: true});
    if (interaction.options.getChannel("channel")) {
        let config = client.database.guilds.read(interaction.guild.id);
        let channel
        try {
            channel = interaction.options.getChannel("channel")
        } catch {
            return await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("CHANNEL.TEXT.DELETE")
                .setTitle("Stats Channel")
                .setDescription("The channel you provided is not a valid channel")
                .setStatus("Danger")
            ]})
        }
        channel = channel as Discord.TextChannel
        if (channel.guild.id != interaction.guild.id) {
            return interaction.editReply({embeds: [new EmojiEmbed()
                .setTitle("Stats Channel")
                .setDescription(`You must choose a channel in this server`)
                .setStatus("Danger")
                .setEmoji("CHANNEL.TEXT.DELETE")
            ]});
        }
        let newName = await convertCurlyBracketString(interaction.options.getString("name"), null, null, interaction.guild.name, interaction.guild.members)
        if (interaction.options.getChannel("channel").type === "GUILD_TEXT") {
            newName = newName.toLowerCase().replace(/[\s]/g, "-")
        }
        let confirmation = await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.TEXT.EDIT")
            .setTitle("Stats Channel")
            .setDescription(`Are you sure you want to set <#${channel.id}> to a stats channel?\n\n*Preview: ${newName}*`)
            .setColor("Warning")
            .setInverted(true)
        .send(true)
        if (confirmation.cancelled) return
        if (confirmation.success) {
            try {
                let name = interaction.options.getString("name")
                let channel = interaction.options.getChannel("channel")
                await client.database.guilds.write(interaction.guild.id, {[`stats.${channel.id}`]: {name: name, enabled: true}});
                const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger
                try {
                    let data = {
                        meta:{
                            type: 'statsChannelUpdate',
                            displayName: 'Stats Channel Updated',
                            calculateType: 'nucleusSettingsUpdated',
                            color: NucleusColors.yellow,
                            emoji: "CHANNEL.TEXT.EDIT",
                            timestamp: new Date().getTime()
                        },
                        list: {
                            memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                            changedBy: entry(interaction.user.id, renderUser(interaction.user)),
                            channel: entry(channel.id, renderChannel(channel)),
                            name: entry(interaction.options.getString("name"), `\`${interaction.options.getString("name")}\``)
                        },
                        hidden: {
                            guild: interaction.guild.id
                        }
                    }
                    log(data);
                } catch {}
            } catch (e) {
                console.log(e)
                return interaction.editReply({embeds: [new EmojiEmbed()
                    .setTitle("Stats Channel")
                    .setDescription(`Something went wrong and the stats channel could not be set`)
                    .setStatus("Danger")
                    .setEmoji("CHANNEL.TEXT.DELETE")
                ], components: []});
            }
        } else {
            return interaction.editReply({embeds: [new EmojiEmbed()
                .setTitle("Stats Channel")
                .setDescription(`No changes were made`)
                .setStatus("Success")
                .setEmoji("CHANNEL.TEXT.CREATE")
            ], components: []});
        }
        await statsChannelAddCallback(client, interaction.member);
        return interaction.editReply({embeds: [new EmojiEmbed()
            .setTitle("Stats Channel")
            .setDescription(`The stats channel has been set to <#${channel.id}>`)
            .setStatus("Success")
            .setEmoji("CHANNEL.TEXT.CREATE")
        ], components: []});
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as Discord.GuildMember)
    if (!member.permissions.has("MANAGE_GUILD")) throw "You must have the Manage Server permission to use this command"
    return true;
}

export { command };
export { callback };
export { check };
