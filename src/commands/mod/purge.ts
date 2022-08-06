import Discord, {
    CommandInteraction,
    GuildChannel,
    GuildMember,
    TextChannel
} from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
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
            option
                .setName("user")
                .setDescription("The user to purge messages from")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("The reason for the purge")
                .setRequired(false)
        );

const callback = async (
    interaction: CommandInteraction
): Promise<void | unknown> => {
    const user = (interaction.options.getMember("user") as GuildMember) ?? null;
    const channel = interaction.channel as GuildChannel;
    if (
        ![
            "GUILD_TEXT",
            "GUILD_NEWS",
            "GUILD_NEWS_THREAD",
            "GUILD_PUBLIC_THREAD",
            "GUILD_PRIVATE_THREAD"
        ].includes(channel.type.toString())
    ) {
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
    if (!interaction.options.getInteger("amount")) {
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
        while (true) {
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
                    new Discord.MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("1")
                            .setLabel("1")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("3")
                            .setLabel("3")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("5")
                            .setLabel("5")
                            .setStyle("SECONDARY")
                    ]),
                    new Discord.MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("10")
                            .setLabel("10")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("25")
                            .setLabel("25")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("50")
                            .setLabel("50")
                            .setStyle("SECONDARY")
                    ]),
                    new Discord.MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("done")
                            .setLabel("Done")
                            .setStyle("SUCCESS")
                            .setEmoji(getEmojiByName("CONTROL.TICK", "id"))
                    ])
                ]
            })) as Discord.Message;
            let component;
            try {
                component = m.awaitMessageComponent({
                    filter: (m) => m.user.id === interaction.user.id,
                    time: 300000
                });
            } catch (e) {
                break;
            }
            component.deferUpdate();
            if (component.customId === "done") break;
            let amount;
            try {
                amount = parseInt(component.customId);
            } catch {
                break;
            }
            let messages;
            await (interaction.channel as TextChannel).messages
                .fetch({ limit: amount })
                .then(async (ms) => {
                    if (user) {
                        ms = ms.filter((m) => m.author.id === user.id);
                    }
                    messages = await (channel as TextChannel).bulkDelete(
                        ms,
                        true
                    );
                });
            if (messages) {
                deleted = deleted.concat(messages.map((m) => m));
            }
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
                user,
                interaction.options.getString("reason"),
                null,
                null,
                deleted.length
            );
        }
        const { log, NucleusColors, entry, renderUser, renderChannel } =
            client.logger;
        const data = {
            meta: {
                type: "channelPurge",
                displayName: "Channel Purged",
                calculateType: "messageDelete",
                color: NucleusColors.red,
                emoji: "PUNISH.BAN.RED",
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(
                    interaction.user.id,
                    `\`${interaction.user.id}\``
                ),
                purgedBy: entry(
                    interaction.user.id,
                    renderUser(interaction.user)
                ),
                channel: entry(
                    interaction.channel.id,
                    renderChannel(interaction.channel)
                ),
                messagesCleared: entry(deleted.length, deleted.length)
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);
        let out = "";
        deleted.reverse().forEach((message) => {
            out += `${message.author.username}#${
                message.author.discriminator
            } (${message.author.id}) [${new Date(
                message.createdTimestamp
            ).toISOString()}]\n`;
            const lines = message.content.split("\n");
            lines.forEach((line) => {
                out += `> ${line}\n`;
            });
            out += "\n\n";
        });
        const attachmentObject = {
            attachment: Buffer.from(out),
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
                new Discord.MessageActionRow().addComponents([
                    new Discord.MessageButton()
                        .setCustomId("download")
                        .setLabel("Download transcript")
                        .setStyle("SUCCESS")
                        .setEmoji(getEmojiByName("CONTROL.DOWNLOAD", "id"))
                ])
            ]
        })) as Discord.Message;
        let component;
        try {
            component = await m.awaitMessageComponent({
                filter: (m) => m.user.id === interaction.user.id,
                time: 300000
            });
        } catch {
            return;
        }
        if (component && component.customId === "download") {
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
                    amount: interaction.options.getInteger("amount").toString(),
                    reason: `\n> ${
                        interaction.options.getString("reason")
                            ? interaction.options.getString("reason")
                            : "*No reason provided*"
                    }`
                })
            )
            .setColor("Danger")
            .send();
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            let messages;
            try {
                if (!user) {
                    const toDelete = await (
                        interaction.channel as TextChannel
                    ).messages.fetch({
                        limit: interaction.options.getInteger("amount")
                    });
                    messages = await (channel as TextChannel).bulkDelete(
                        toDelete,
                        true
                    );
                } else {
                    const toDelete = (
                        await (
                            await (
                                interaction.channel as TextChannel
                            ).messages.fetch({
                                limit: 100
                            })
                        ).filter((m) => m.author.id === user.id)
                    ).first(interaction.options.getInteger("amount"));
                    messages = await (channel as TextChannel).bulkDelete(
                        toDelete,
                        true
                    );
                }
            } catch (e) {
                await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("CHANNEL.PURGE.RED")
                            .setTitle("Purge")
                            .setDescription(
                                "Something went wrong and no messages were deleted"
                            )
                            .setStatus("Danger")
                    ],
                    components: []
                });
            }
            if (user) {
                await client.database.history.create(
                    "purge",
                    interaction.guild.id,
                    user,
                    interaction.options.getString("reason"),
                    null,
                    null,
                    messages.size
                );
            }
            const { log, NucleusColors, entry, renderUser, renderChannel } =
                client.logger;
            const data = {
                meta: {
                    type: "channelPurge",
                    displayName: "Channel Purged",
                    calculateType: "messageDelete",
                    color: NucleusColors.red,
                    emoji: "PUNISH.BAN.RED",
                    timestamp: new Date().getTime()
                },
                list: {
                    memberId: entry(
                        interaction.user.id,
                        `\`${interaction.user.id}\``
                    ),
                    purgedBy: entry(
                        interaction.user.id,
                        renderUser(interaction.user)
                    ),
                    channel: entry(
                        interaction.channel.id,
                        renderChannel(interaction.channel)
                    ),
                    messagesCleared: entry(messages.size, messages.size)
                },
                hidden: {
                    guild: interaction.guild.id
                }
            };
            log(data);
            let out = "";
            messages.reverse().forEach((message) => {
                out += `${message.author.username}#${
                    message.author.discriminator
                } (${message.author.id}) [${new Date(
                    message.createdTimestamp
                ).toISOString()}]\n`;
                const lines = message.content.split("\n");
                lines.forEach((line) => {
                    out += `> ${line}\n`;
                });
                out += "\n\n";
            });
            const attachmentObject = {
                attachment: Buffer.from(out),
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
                    new Discord.MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("download")
                            .setLabel("Download transcript")
                            .setStyle("SUCCESS")
                            .setEmoji(getEmojiByName("CONTROL.DOWNLOAD", "id"))
                    ])
                ]
            })) as Discord.Message;
            let component;
            try {
                component = await m.awaitMessageComponent({
                    filter: (m) => m.user.id === interaction.user.id,
                    time: 300000
                });
            } catch {
                return;
            }
            if (component && component.customId === "download") {
                interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("CHANNEL.PURGE.GREEN")
                            .setTitle("Purge")
                            .setDescription("Transcript uploaded above")
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
        } else {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.GREEN")
                        .setTitle("Purge")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                ],
                components: []
            });
        }
    }
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    const me = interaction.guild.me!;
    // Check if nucleus has the manage_messages permission
    if (!me.permissions.has("MANAGE_MESSAGES"))
        throw "I do not have the *Manage Messages* permission";
    // Allow the owner to purge
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has manage_messages permission
    if (!member.permissions.has("MANAGE_MESSAGES"))
        throw "You do not have the *Manage Messages* permission";
    // Allow purge
    return true;
};

export { command, callback, check };
