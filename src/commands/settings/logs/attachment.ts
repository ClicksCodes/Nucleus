import { LoadingEmbed } from "../../../utils/defaults.js";
import Discord, { CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } from "discord.js";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../../utils/getEmojiByName.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../../utils/client.js";
import { getCommandMentionByName } from "../../../utils/getCommandDataByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("attachments")
        .setDescription("Where attachments should be logged to (Premium only)")

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (interaction.guild) client.database.premium.hasPremium(interaction.guild.id).finally(() => {});
    await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })

    if(!await client.database.premium.hasPremium(interaction.guild!.id)) return interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Premium Required")
                .setDescription(`This feature is exclusive to ${getCommandMentionByName("nucleus/premium")} servers.`)
                .setStatus("Danger")
                .setEmoji("NUCLEUS.PREMIUM")
        ]
    });

    let data = await client.database.guilds.read(interaction.guild!.id);
    let channel = data.logging.staff.channel;

    let closed = false;
    do {
        const channelMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("channel")
                    .setPlaceholder("Select a channel")
                    .setChannelTypes(ChannelType.GuildText)
            );
        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clear")
                    .setLabel("Clear")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id") as Discord.APIMessageComponentEmoji)
                    .setDisabled(!channel),
                new ButtonBuilder()
                    .setCustomId("save")
                    .setLabel("Save")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(getEmojiByName("ICONS.SAVE", "id") as Discord.APIMessageComponentEmoji)
                    .setDisabled(channel === data.logging.staff.channel)
            );

        const embed = new EmojiEmbed()
            .setTitle("Attachments")
            .setDescription(
                `The channel to send all attachments from the server, allowing you to check them if they are deleted\n` +
                `**Channel:** ${channel ? `<#${channel}>` : "*None*"}\n`
            )
            .setStatus("Success")
            .setEmoji("CHANNEL.TEXT.CREATE")

        await interaction.editReply({
            embeds: [embed],
            components: [channelMenu, buttons]
        });

        let i: Discord.ButtonInteraction | Discord.SelectMenuInteraction;
        try {
            i = (await interaction.channel!.awaitMessageComponent({
                filter: (i: Discord.Interaction) => i.user.id === interaction.user.id,
                time: 300000
            })) as Discord.ButtonInteraction | Discord.SelectMenuInteraction;
        } catch (e) {
            closed = true;
            continue;
        }
        await i.deferUpdate();
        if(i.isButton()) {
            switch (i.customId) {
                case "clear": {
                    channel = null;
                    break;
                }
                case "save": {
                    await client.database.guilds.write(interaction.guild!.id, {
                        "logging.attachments.channel": channel
                    });
                    data = await client.database.guilds.read(interaction.guild!.id);
                    await client.memory.forceUpdate(interaction.guild!.id);
                    break;
                }
            }
        } else {
            channel = i.values[0]!;
        }

    } while (!closed);
    await interaction.deleteReply()
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
