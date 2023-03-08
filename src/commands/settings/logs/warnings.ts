import { LoadingEmbed } from "../../../utils/defaults.js";
import Discord, {
    CommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    ComponentType
} from "discord.js";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../../utils/getEmojiByName.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../../utils/client.js";
import _ from "lodash";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("warnings").setDescription("Settings for the staff notifications channel");

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    });

    let data = await client.database.guilds.read(interaction.guild.id);
    let channel = _.clone(data.logging.staff.channel);
    let closed = false;
    do {
        const channelMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setPlaceholder("Select a channel")
                .setChannelTypes(ChannelType.GuildText)
        );
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
                .setDisabled(_.isEqual(channel, data.logging.staff.channel))
        );

        const embed = new EmojiEmbed()
            .setTitle("Staff Notifications Channel")
            .setStatus("Success")
            .setEmoji("CHANNEL.TEXT.CREATE")
            .setDescription(
                `Logs which require an action from a moderator or administrator will be sent to this channel.\n` +
                    `**Channel:** ${channel ? `<#${channel}>` : "*None*"}\n`
            );

        await interaction.editReply({
            embeds: [embed],
            components: [channelMenu, buttons]
        });

        let i: Discord.ButtonInteraction | Discord.ChannelSelectMenuInteraction;
        try {
            i = (await interaction.channel!.awaitMessageComponent<ComponentType.Button | ComponentType.ChannelSelect>({
                filter: (i: Discord.Interaction) => i.user.id === interaction.user.id,
                time: 300000
            }))
        } catch (e) {
            closed = true;
            continue;
        }
        await i.deferUpdate();
        if (i.isButton()) {
            switch (i.customId) {
                case "clear": {
                    channel = null;
                    break;
                }
                case "save": {
                    await client.database.guilds.write(interaction.guild!.id, {
                        "logging.staff.channel": channel
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

    await interaction.deleteReply();
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
