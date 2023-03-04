import { ActionRowBuilder, APIMessageComponentEmoji, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, CommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import type Discord from "discord.js";
import client from "../../utils/client.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import compare from "lodash"
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

export const command = new SlashCommandSubcommandBuilder()
    .setName("autopublish")
    .setDescription("Automatically publish messages posted in announcement channels");

export const callback = async (interaction: CommandInteraction): Promise<void> => {
    await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    });

    let closed = false;
    let config = await client.database.guilds.read(interaction.guild!.id);
    let data = Object.assign({}, config.autoPublish);
    do {
        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("switch")
                    .setLabel(data.enabled ? "Enabled" : "Disabled")
                    .setStyle(data.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(getEmojiByName("CONTROL." + (data.enabled ? "TICK" : "CROSS"), "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("save")
                    .setLabel("Save")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                    .setDisabled(compare.isEqual(data, config.autoPublish))
            );

        const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("channel")
                    .setPlaceholder("Select a channel")
                    .setMinValues(1)
                    .setChannelTypes(ChannelType.GuildAnnouncement, ChannelType.AnnouncementThread)
            );

        const current = data.channels.map((c) => `> <#${c}>`).join("\n") || "*None set*";

        const embed = new EmojiEmbed()
            .setTitle("Auto Publish")
            .setDescription("Currently enabled in:\n" + current)
            .setStatus('Success')
            .setEmoji("ICONS.PUBLISH")

            await interaction.editReply({
            embeds: [embed],
            components: [channelSelect, buttons]
        });

        let i: Discord.ButtonInteraction | Discord.ChannelSelectMenuInteraction;
        try {
            i = await interaction.channel!.awaitMessageComponent({
                filter: (i: Discord.Interaction) => i.user.id === interaction.user.id,
                time: 300000
            }) as Discord.ButtonInteraction | Discord.ChannelSelectMenuInteraction;
        } catch (e) {
            closed = true;
            continue;
        }
        await i.deferUpdate();
        if(i.isButton()) {
            switch(i.customId) {
                case "switch": {
                    data.enabled = !data.enabled;
                    break;
                }
                case "save": {
                    await client.database.guilds.write(interaction.guild!.id, { "autoPublish": data });
                    config = await client.database.guilds.read(interaction.guild!.id);
                    data = Object.assign({}, config.autoPublish);
                    break;
                }
            }
        } else {
            await interaction.editReply({embeds: LoadingEmbed, components: []})
            for(const channel of i.values) {
                data.channels.includes(channel) ? data.channels.splice(data.channels.indexOf(channel), 1) : data.channels.push(channel);
            }
        }

    } while (!closed);

    await interaction.deleteReply();
}

export const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    const me = interaction.guild!.members.me!;
    if (!member.permissions.has("ManageMessages"))
        return "You must have the *Manage Messages* permission to use this command";
    if (_partial) return true;
    if (!me.permissions.has("ManageMessages")) return "I do not have the *Manage Messages* permission";
    return true;
};
