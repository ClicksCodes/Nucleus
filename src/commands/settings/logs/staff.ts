import { LoadingEmbed } from "../../../utils/defaults.js";
import { ChannelType } from "discord-api-types/v9";
import Discord, { CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../../utils/confirmationMessage.js";
import getEmojiByName from "../../../utils/getEmojiByName.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import client from "../../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("staff")
        .setDescription("Settings for the staff notifications channel")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to set the staff notifications channel to")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Discord.Message;
    if (interaction.options.getChannel("channel")) {
        let channel;
        try {
            channel = interaction.options.getChannel("channel");
        } catch {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.TEXT.DELETE")
                        .setTitle("Staff Notifications Channel")
                        .setDescription("The channel you provided is not a valid channel")
                        .setStatus("Danger")
                ]
            });
        }
        channel = channel as Discord.TextChannel;
        if (channel.guild.id !== interaction.guild.id) {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Staff Notifications Channel")
                        .setDescription("You must choose a channel in this server")
                        .setStatus("Danger")
                        .setEmoji("CHANNEL.TEXT.DELETE")
                ]
            });
        }
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.TEXT.EDIT", "CHANNEL.TEXT.DELETE")
            .setTitle("Staff Notifications Channel")
            .setDescription(
                "This will be the channel all notifications, updates, user reports etc. will be sent to.\n\n" +
                    `Are you sure you want to set the staff notifications channel to <#${channel.id}>?`
            )
            .setColor("Warning")
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            try {
                await client.database.guilds.write(interaction.guild.id, {
                    "logging.staff.channel": channel.id
                });
                const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger;
                const data = {
                    meta: {
                        type: "staffChannelUpdate",
                        displayName: "Staff Notifications Channel Updated",
                        calculateType: "nucleusSettingsUpdated",
                        color: NucleusColors.yellow,
                        emoji: "CHANNEL.TEXT.EDIT",
                        timestamp: new Date().getTime()
                    },
                    list: {
                        memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                        changedBy: entry(interaction.user.id, renderUser(interaction.user)),
                        channel: entry(channel.id, renderChannel(channel))
                    },
                    hidden: {
                        guild: interaction.guild.id
                    }
                };
                log(data);
            } catch (e) {
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Staff Notifications Channel")
                            .setDescription("Something went wrong and the staff notifications channel could not be set")
                            .setStatus("Danger")
                            .setEmoji("CHANNEL.TEXT.DELETE")
                    ],
                    components: []
                });
            }
        } else {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Staff Notifications Channel")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                        .setEmoji("CHANNEL.TEXT.CREATE")
                ],
                components: []
            });
        }
    }
    let clicks = 0;
    const data = await client.database.guilds.read(interaction.guild.id);
    let channel = data.logging.staff.channel;
    let timedOut = false;
    while (!timedOut) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Staff Notifications channel")
                    .setDescription(
                        channel
                            ? `Your staff notifications channel is currently set to <#${channel}>`
                            : "This server does not have a staff notifications channel"
                    )
                    .setStatus("Success")
                    .setEmoji("CHANNEL.TEXT.CREATE")
            ],
            components: [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId("clear")
                        .setLabel(clicks ? "Click again to confirm" : "Reset channel")
                        .setEmoji(getEmojiByName(clicks ? "TICKETS.ISSUE" : "CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(!channel)
                ])
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        i.deferUpdate();
        if ((i.component as ButtonBuilder).customId === "clear") {
            clicks += 1;
            if (clicks === 2) {
                clicks = 0;
                await client.database.guilds.write(interaction.guild.id, null, ["logging.staff.channel"]);
                channel = undefined;
            }
        }
    }
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Staff Notifications channel")
                .setDescription(
                    channel
                        ? `Your staff notifications channel is currently set to <#${channel}>`
                        : "This server does not have a staff notifications channel"
                )
                .setStatus("Success")
                .setEmoji("CHANNEL.TEXT.CREATE")
                .setFooter({ text: "Message closed" })
        ],
        components: [
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId("clear")
                    .setLabel("Clear")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            ])
        ]
    });
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
