import { LoadingEmbed } from "./../../../utils/defaultEmbeds.js";
import { ChannelType } from "discord-api-types/v9";
import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../../utils/confirmationMessage.js";
import getEmojiByName from "../../../utils/getEmojiByName.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("attachments")
        .setDescription("Where attachments should be logged to (Premium only)")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to log attachments in")
                .addChannelTypes([ChannelType.GuildNews, ChannelType.GuildText])
                .setRequired(false)
        );

const callback = async (interaction: CommandInteraction): Promise<void | unknown> => {
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
                        .setTitle("Attachment Log Channel")
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
                        .setTitle("Attachment Log Channel")
                        .setDescription("You must choose a channel in this server")
                        .setStatus("Danger")
                        .setEmoji("CHANNEL.TEXT.DELETE")
                ]
            });
        }
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.TEXT.EDIT")
            .setTitle("Attachment Log Channel")
            .setDescription(
                "This will be the channel all attachments will be sent to.\n\n" +
                    `Are you sure you want to set the attachment log channel to <#${channel.id}>?`
            )
            .setColor("Warning")
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            try {
                await client.database.guilds.write(interaction.guild.id, {
                    "logging.attachments.channel": channel.id
                });
                const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger;
                const data = {
                    meta: {
                        type: "attachmentChannelUpdate",
                        displayName: "Attachment Log Channel Updated",
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
                            .setTitle("Attachment Log Channel")
                            .setDescription("Something went wrong and the attachment log channel could not be set")
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
                        .setTitle("Attachment Log Channel")
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
    while (true) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Attachment Log Channel")
                    .setDescription(
                        channel
                            ? `Your attachment log channel is currently set to <#${channel}>`
                            : "This server does not have an attachment log channel" +
                                  (client.database.premium.hasPremium(interaction.guild.id)
                                      ? ""
                                      : "\n\nThis server does not have premium, so this feature is disabled")
                    )
                    .setStatus("Success")
                    .setEmoji("CHANNEL.TEXT.CREATE")
            ],
            components: [
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setCustomId("clear")
                        .setLabel(clicks ? "Click again to confirm" : "Reset channel")
                        .setEmoji(getEmojiByName(clicks ? "TICKETS.ISSUE" : "CONTROL.CROSS", "id"))
                        .setStyle("DANGER")
                        .setDisabled(!channel)
                ])
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            break;
        }
        i.deferUpdate();
        if (i.component.customId === "clear") {
            clicks += 1;
            if (clicks === 2) {
                clicks = 0;
                await client.database.guilds.write(interaction.guild.id, null, ["logging.announcements.channel"]);
                channel = undefined;
            }
        } else {
            break;
        }
    }
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Attachment Log Channel")
                .setDescription(
                    channel
                        ? `Your attachment log channel is currently set to <#${channel}>`
                        : "This server does not have an attachment log channel"
                )
                .setStatus("Success")
                .setEmoji("CHANNEL.TEXT.CREATE")
                .setFooter({ text: "Message closed" })
        ],
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId("clear")
                    .setLabel("Clear")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    .setStyle("SECONDARY")
                    .setDisabled(true)
            ])
        ]
    });
};

const check = (interaction: CommandInteraction, _defaultCheck: WrappedCheck) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_GUILD"))
        throw "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
