import { LoadingEmbed } from "../../../utils/defaults.js";
import Discord, { CommandInteraction, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonInteraction, StringSelectMenuInteraction, ChannelSelectMenuInteraction, APIMessageComponentEmoji } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../../utils/client.js";
import compare from "lodash";
import { toHexArray, toHexInteger } from "../../../utils/calculate.js";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../../utils/getEmojiByName.js";

const logs: Record<string, string> = {
    channelUpdate: "Channels created, deleted or modified",
    emojiUpdate: "Server emojis modified",
    stickerUpdate: "Server stickers modified",
    guildUpdate: "Server settings updated",
    guildMemberUpdate: "Member updated (i.e. nickname)",
    guildMemberPunish: "Members punished (i.e. muted, banned, kicked)",
    guildRoleUpdate: "Role settings changed",
    guildInviteUpdate: "Server invite created or deleted",
    messageUpdate: "Message edited",
    messageDelete: "Message deleted",
    messageDeleteBulk: "Messages purged",
    messageReactionUpdate: "Message reactions cleared",
    messageMassPing: "Message pings multiple members at once",
    messageAnnounce: "Message published in announcement channel",
    threadUpdate: "Thread created or deleted",
    webhookUpdate: "Webhooks created or deleted",
    guildMemberVerify: "Member runs verify",
    autoModeratorDeleted: "Messages auto deleted by Nucleus",
    ticketUpdate: "Tickets created or deleted",
    //nucleusSettingsUpdated: "Nucleus' settings updated by a moderator"  // TODO
};

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("events")
        .setDescription("The general log channel for the server, and setting what events to show")

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Discord.Message;

    let config = await client.database.guilds.read(interaction.guild!.id);
    let data = Object.assign({}, config.logging.logs);
    let closed = false;
    let show = false;
    do {
        const channelMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("channel")
                    .setPlaceholder("Select a channel")
                    .setChannelTypes(ChannelType.GuildText)
            )
        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("switch")
                    .setLabel(data.enabled ? "Enabled" : "Disabled")
                    .setStyle(data.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(getEmojiByName((data.enabled ? "CONTROL.TICK" : "CONTROL.CROSS"), "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("remove")
                    .setLabel("Remove")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!data.channel),
                new ButtonBuilder()
                    .setCustomId("show")
                    .setLabel("Manage Events")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("save")
                    .setLabel("Save")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(compare.isEqual(data, config.logging.logs))
            )

        const converted = toHexArray(data.toLog);
        const toLogMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setPlaceholder("Set events to log")
                    .setMaxValues(Object.keys(logs).length)
                    .setCustomId("logs")
                    .setMinValues(0)
            )
        Object.keys(logs).map((e) => {
            toLogMenu.components[0]!.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(logs[e]!)
                    .setValue(e)
                    .setDefault(converted.includes(e))
            )
        });

        const embed = new EmojiEmbed()
            .setTitle("General Log Channel")
            .setStatus("Success")
            .setEmoji("CHANNEL.TEXT.CREATE")
            .setDescription(
                `This is the channel that all events you set to be logged will be stored\n` +
                `**Channel:** ${data.channel ? `<#${data.channel}>` : "None"}\n`
            )

        const components: ActionRowBuilder<ButtonBuilder | ChannelSelectMenuBuilder | StringSelectMenuBuilder>[] = [channelMenu, buttons];
        if(show) components.push(toLogMenu);

        await interaction.editReply({
            embeds: [embed],
            components: components
        });

        let i: ButtonInteraction | StringSelectMenuInteraction | ChannelSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000
            }) as ButtonInteraction | StringSelectMenuInteraction | ChannelSelectMenuInteraction;
        } catch (e) {
            closed = true;
            continue;
        }

        await i.deferUpdate();

        if(i.isButton()) {
            switch(i.customId) {
                case "show": {
                    show = !show;
                    break;
                }
                case "switch": {
                    data.enabled = !data.enabled;
                    break;
                }
                case "save": {
                    await client.database.guilds.write(interaction.guild!.id, {"logging.logs": data});
                    config = await client.database.guilds.read(interaction.guild!.id);
                    data = Object.assign({}, config.logging.logs);
                    break;
                }
                case "remove": {
                    data.channel = null;
                    break;
                }
            }
        } else if(i.isStringSelectMenu()) {
            const hex = toHexInteger(i.values);
            data.toLog = hex;
        } else if(i.isChannelSelectMenu()) {
            data.channel = i.values[0]!;
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
