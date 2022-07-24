import { ChannelType } from 'discord-api-types';
import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../../utils/confirmationMessage.js";
import getEmojiByName from "../../../utils/getEmojiByName.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("remove")
    .setDescription("Stops updating channels when a member joins or leaves")
    .addChannelOption(option => option.setName("channel").setDescription("The channel to stop updating").addChannelTypes([
        ChannelType.GuildNews, ChannelType.GuildText
    ]).setRequired(true))

const callback = async (interaction: CommandInteraction): Promise<any> => {
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
        // check if the channel is not in the list
        let allow = false;
        for (let c of config.stats) { if (c.channel == channel.id) allow = true; }
        if (!allow) {
            return interaction.editReply({embeds: [new EmojiEmbed()
                .setTitle("Stats Channel")
                .setDescription(`That channel is not a stats channel`)
                .setStatus("Danger")
                .setEmoji("CHANNEL.TEXT.DELETE")
            ]});
        }
        let confirmation = await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.TEXT.EDIT")
            .setTitle("Stats Channel")
            .setDescription(`Are you sure you want to stop <#${channel.id}> updating?`)
            .setColor("Warning")
            .setInverted(true)
        .send(true)
        if (confirmation.cancelled) return
        if (confirmation.success) {
            try {
                let channel = interaction.options.getChannel("channel")
                await client.database.guilds.write(interaction.guild.id, {}, [`stats.${channel.id}`]);
                const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger
                try {
                    let data = {
                        meta:{
                            type: 'statsChannelUpdate',
                            displayName: 'Stats Channel Removed',
                            calculateType: 'nucleusSettingsUpdated',
                            color: NucleusColors.red,
                            emoji: "CHANNEL.TEXT.EDIT",
                            timestamp: new Date().getTime()
                        },
                        list: {
                            memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                            changedBy: entry(interaction.user.id, renderUser(interaction.user)),
                            channel: entry(channel.id, renderChannel(channel)),
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
                    .setDescription(`Something went wrong and the stats channel could not be reset`)
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
