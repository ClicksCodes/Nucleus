import Discord, { CommandInteraction, GuildChannel, GuildMember, TextChannel, ButtonStyle, ButtonBuilder, Message } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("purge")
        .setDescription("Bulk deletes messages in a channel")
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount of messages to delete")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption((option) =>
            option.setName("user").setDescription("The user to purge messages from").setRequired(false)
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for the purge").setRequired(false)
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const user = (interaction.options.getMember("user") as GuildMember | null);
    const channel = interaction.channel as GuildChannel;
    if (!channel.isTextBased()) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setTitle("Purge")
                    .setDescription("You cannot purge this channel")
                    .setStatus("Danger")
            ],
            components: [],
            ephemeral: true
        });
    }
    // TODO:[Modals] Replace this with a modal
    if (!interaction.options.get("amount")) {
        await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setTitle("Purge")
                    .setDescription("Select how many messages to delete")
                    .setStatus("Danger")
            ],
            components: [],
            ephemeral: true,
            fetchReply: true
        });
        let deleted = [] as Discord.Message[];
        let timedOut = false;
        let amountSelected = false;
        while (!timedOut && !amountSelected) {
            const m = (await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.RED")
                        .setTitle("Purge")
                        .setDescription(
                            "Select how many messages to delete. You can continue clicking until all messages are cleared."
                        )
                        .setStatus("Danger")
                ],
                components: [
                    new Discord.ActionRowBuilder<ButtonBuilder>().addComponents([
                        new Discord.ButtonBuilder().setCustomId("1").setLabel("1").setStyle(ButtonStyle.Secondary),
                        new Discord.ButtonBuilder().setCustomId("3").setLabel("3").setStyle(ButtonStyle.Secondary),
                        new Discord.ButtonBuilder().setCustomId("5").setLabel("5").setStyle(ButtonStyle.Secondary)
                    ]),
                    new Discord.ActionRowBuilder<ButtonBuilder>().addComponents([
                        new Discord.ButtonBuilder().setCustomId("10").setLabel("10").setStyle(ButtonStyle.Secondary),
                        new Discord.ButtonBuilder().setCustomId("25").setLabel("25").setStyle(ButtonStyle.Secondary),
                        new Discord.ButtonBuilder().setCustomId("50").setLabel("50").setStyle(ButtonStyle.Secondary)
                    ]),
                    new Discord.ActionRowBuilder<ButtonBuilder>().addComponents([
                        new Discord.ButtonBuilder()
                            .setCustomId("done")
                            .setLabel("Done")
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(getEmojiByName("CONTROL.TICK", "id"))
                    ])
                ]
            })) as Discord.Message;
            let component;
            try {
                component = m.awaitMessageComponent({
                    filter: (i) => i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.id === m.id,
                    time: 300000
                });
            } catch (e) {
                timedOut = true;
                continue;
            }
            (await component).deferUpdate();
            if ((await component).customId === "done") {
                amountSelected = true;
                continue;
            }
            const amount = parseInt((await component).customId);

            let messages: Discord.Message[] = [];
            await (interaction.channel as TextChannel).messages.fetch({ limit: amount }).then(async (ms) => {
                if (user) {
                    ms = ms.filter((m) => m.author.id === user.id);
                }
                messages = (await (channel as TextChannel).bulkDelete(ms, true)).map(m => m as Discord.Message);
            });
            deleted = deleted.concat(messages);
        }
        if (deleted.length === 0)
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.RED")
                        .setTitle("Purge")
                        .setDescription("No messages were deleted")
                        .setStatus("Danger")
                ],
                components: []
            });
        if (user) {
            await client.database.history.create(
                "purge",
                interaction.guild.id,
                user.user,
                interaction.user,
                (interaction.options.get("reason")?.value as (string | null)) ?? "*No reason provided*",
                null,
                null,
                deleted.length.toString()
            );
        }
        const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger;
        const data = {
            meta: {
                type: "channelPurge",
                displayName: "Channel Purged",
                calculateType: "messageDelete",
                color: NucleusColors.red,
                emoji: "CHANNEL.PURGE.RED",
                timestamp: Date.now()
            },
            list: {
                memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                purgedBy: entry(interaction.user.id, renderUser(interaction.user)),
                channel: entry(interaction.channel!.id, renderChannel(interaction.channel! as GuildChannel)),
                messagesCleared: entry(deleted.length.toString(), deleted.length.toString())
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);
        const newOut = await client.database.transcripts.createTranscript(deleted, interaction, interaction.member as GuildMember);
        const transcript = client.database.transcripts.toHumanReadable(newOut);
        const attachmentObject = {
            attachment: Buffer.from(transcript),
            name: `purge-${channel.id}-${Date.now()}.txt`,
            description: "Purge log"
        };
        const m = (await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.GREEN")
                    .setTitle("Purge")
                    .setDescription("Messages cleared")
                    .setStatus("Success")
            ],
            components: [
                new Discord.ActionRowBuilder<ButtonBuilder>().addComponents([
                    new Discord.ButtonBuilder()
                        .setCustomId("download")
                        .setLabel("Download transcript")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(getEmojiByName("CONTROL.DOWNLOAD", "id"))
                ])
            ]
        })) as Discord.Message;
        let component;
        try {
            component = await m.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.id === m.id,
                time: 300000
            });
        } catch {
            return;
        }
        if (component.customId === "download") {
            interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.GREEN")
                        .setTitle("Purge")
                        .setDescription("Uploaded")
                        .setStatus("Success")
                ],
                components: [],
                files: [attachmentObject]
            });
        } else {
            interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.GREEN")
                        .setTitle("Purge")
                        .setDescription("Messages cleared")
                        .setStatus("Success")
                ],
                components: []
            });
        }
        return;
    } else {
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.PURGE.RED")
            .setTitle("Purge")
            .setDescription(
                keyValueList({
                    channel: `<#${channel.id}>`,
                    amount: (interaction.options.get("amount")?.value as number).toString(),
                    reason: `\n> ${interaction.options.get("reason")?.value ? interaction.options.get("reason")?.value : "*No reason provided*"}`
                })
            )
            .setColor("Danger")
            .setFailedMessage("No changes were made", "Success", "CHANNEL.PURGE.GREEN")
            .send();
        if (confirmation.cancelled || !confirmation.success) return;
        let messages;
        try {
            if (!user) {
                const toDelete = await (interaction.channel as TextChannel).messages.fetch({
                    limit: interaction.options.get("amount")?.value as number
                });
                messages = await (channel as TextChannel).bulkDelete(toDelete, true);
            } else {
                const toDelete = (
                    await (
                        await (interaction.channel as TextChannel).messages.fetch({
                            limit: 100
                        })
                    ).filter((m) => m.author.id === user.id)
                ).first(interaction.options.get("amount")?.value as number);
                messages = await (channel as TextChannel).bulkDelete(toDelete, true);
            }
        } catch (e) {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.RED")
                        .setTitle("Purge")
                        .setDescription("Something went wrong and no messages were deleted")
                        .setStatus("Danger")
                ],
                components: []
            });
        }
        if (!messages) {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.RED")
                        .setTitle("Purge")
                        .setDescription("No messages could be deleted")
                        .setStatus("Danger")
                ],
                components: []
            });
            return;
        }
        if (user) {
            await client.database.history.create(
                "purge",
                interaction.guild.id,
                user.user,
                interaction.user,
                (interaction.options.get("reason")?.value as (string | null)) ?? "*No reason provided*",
                null,
                null,
                messages.size.toString()
            );
        }
        const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger;
        const data = {
            meta: {
                type: "channelPurge",
                displayName: "Channel Purged",
                calculateType: "messageDelete",
                color: NucleusColors.red,
                emoji: "CHANNEL.PURGE.RED",
                timestamp: Date.now()
            },
            list: {
                memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                purgedBy: entry(interaction.user.id, renderUser(interaction.user)),
                channel: entry(interaction.channel!.id, renderChannel(interaction.channel! as GuildChannel)),
                messagesCleared: entry(messages.size.toString(), messages.size.toString())
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);
        const messageArray: Message[] = messages.filter(message => !(
            message!.components.some(
                component => component.components.some(
                    child => child.customId?.includes("transcript") ?? false
                )
            )
        )).map(message => message as Message);
        const newOut = await client.database.transcripts.createTranscript(messageArray, interaction, interaction.member as GuildMember);

        const [code, key, iv] = await client.database.transcripts.create(newOut);

        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.GREEN")
                    .setTitle("Purge")
                    .setDescription("Messages cleared")
                    .setStatus("Success")
            ],
            components: [
                new Discord.ActionRowBuilder<ButtonBuilder>().addComponents([

                    new ButtonBuilder().setLabel("View").setStyle(ButtonStyle.Link).setURL(`https://clicks.codes/nucleus/transcript/${code}?key=${key}&iv=${iv}`).setDisabled(!code),

                ])
            ]
        });
    }
};

const check = (interaction: CommandInteraction, partial: boolean = false) => {
    if (!interaction.guild) return false;
    const member = interaction.member as GuildMember;
    // Check if the user has manage_messages permission
    if (!member.permissions.has("ManageMessages")) return "You do not have the *Manage Messages* permission";
    if (partial) return true;
    const me = interaction.guild.members.me!;
    // Check if nucleus has the manage_messages permission
    if (!me.permissions.has("ManageMessages")) return "I do not have the *Manage Messages* permission";
    // Allow the owner to purge
    if (member.id === interaction.guild.ownerId) return true;
    // Allow purge
    return true;
};

export { command, callback, check };
export const metadata = {
    longDescription: "Deletes a specified amount of messages from a channel, optionally from a specific user. Without an amount, you can repeatedly choose a number of messages to delete.",
    premiumOnly: true,
}
