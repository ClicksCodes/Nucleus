import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContextMenuCommandBuilder,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    MessageContextMenuCommandInteraction,
    PermissionFlagsBits
} from "discord.js";
import client from "../../utils/client.js";
import { messageException } from "../../utils/createTemporaryStorage.js";

const command = new ContextMenuCommandBuilder()
    .setName("Purge up to Here")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

async function waitForButton(m: Discord.Message, member: Discord.GuildMember): Promise<boolean> {
    let component;
    try {
        component = await m.awaitMessageComponent({
            time: 200000,
            filter: (i) => i.user.id === member.id && i.channel!.id === m.channel.id && i.message.id === m.id
        });
    } catch (e) {
        return false;
    }
    await component.deferUpdate();
    return true;
}

const callback = async (interaction: MessageContextMenuCommandInteraction) => {
    await interaction.targetMessage.fetch();
    const targetMessage = interaction.targetMessage;
    const targetMember: Discord.User = targetMessage.author;
    let allowedMessage: Discord.Message | undefined = undefined;
    const channel = interaction.channel;
    if (!channel) return;
    await interaction.reply({ embeds: LoadingEmbed, ephemeral: true, fetchReply: true });
    const history: Discord.Collection<string, Discord.Message> = await channel.messages.fetch({ limit: 100 });
    if (Date.now() - targetMessage.createdTimestamp > 2 * 7 * 24 * 60 * 60 * 1000) {
        const m = await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Purge")
                    .setDescription(
                        "The message you selected is older than 2 weeks. Discord only allows bots to delete messages that are 2 weeks old or younger."
                    )
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setStatus("Danger")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("oldest")
                        .setLabel("Select first allowed message")
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });
        if (!(await waitForButton(m, interaction.member as Discord.GuildMember))) return;
    } else if (!history.has(targetMessage.id)) {
        const m = await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Purge")
                    .setDescription(
                        "The message you selected is not in the last 100 messages in this channel. Discord only allows bots to delete 100 messages at a time."
                    )
                    .setEmoji("CHANNEL.PURGE.YELLOW")
                    .setStatus("Warning")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("oldest")
                        .setLabel("Select first allowed message")
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });
        if (!(await waitForButton(m, interaction.member as Discord.GuildMember))) return;
    } else {
        allowedMessage = targetMessage;
    }

    if (!allowedMessage) {
        // Find the oldest message thats younger than 2 weeks
        const messages = history.filter((m) => Date.now() - m.createdTimestamp < 2 * 7 * 24 * 60 * 60 * 1000);
        allowedMessage = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).first();
    }

    if (!allowedMessage) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Purge")
                    .setDescription(
                        "There are no valid messages in the last 100 messages. (No messages younger than 2 weeks)"
                    )
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setStatus("Danger")
            ],
            components: []
        });
        return;
    }

    let reason: string | null = null;
    let confirmation;
    let chosen = false;
    let timedOut = false;
    let deleteSelected = true;
    let deleteUser = false;
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.PURGE.RED")
            .setTitle("Purge")
            .setDescription(
                `[[Selected Message]](${allowedMessage.url})\n\n` +
                    (reason ? "\n> " + reason.replaceAll("\n", "\n> ") : "*No reason provided*") +
                    "\n\n" +
                    `Are you sure you want to delete all messages from below the selected message?`
            )
            .addCustomBoolean(
                "includeSelected",
                "Include selected message",
                false,
                undefined,
                "The selected message will be deleted as well.",
                "The selected message will not be deleted.",
                "CONTROL." + (deleteSelected ? "TICK" : "CROSS"),
                deleteSelected
            )
            .addCustomBoolean(
                "onlySelectedUser",
                "Only selected user",
                false,
                undefined,
                `Only messages from <@${targetMember.id}> will be deleted.`,
                `All messages will be deleted.`,
                "CONTROL." + (deleteUser ? "TICK" : "CROSS"),
                deleteUser
            )
            .setColor("Danger")
            .addReasonButton(reason ?? "")
            .setFailedMessage("No changes were made", "Success", "CHANNEL.PURGE.GREEN")
            .send(true);
        reason = reason ?? "";
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) chosen = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) {
            deleteSelected = confirmation.components["includeSelected"]!.active;
            deleteUser = confirmation.components["onlySelectedUser"]!.active;
        }
    } while (!chosen && !timedOut);
    if (timedOut || !confirmation.success) return;
    const filteredMessages = history
        .filter((m) => m.createdTimestamp >= allowedMessage!.createdTimestamp) // older than selected
        .filter((m) => (deleteUser ? m.author.id === targetMember.id : true)) // only selected user
        .filter((m) => (deleteSelected ? true : m.id !== allowedMessage!.id)); // include selected

    const deleted = await (channel as GuildTextBasedChannel).bulkDelete(filteredMessages, true);
    if (deleted.size === 0) {
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
    }
    if (deleteUser) {
        await client.database.history.create(
            "purge",
            interaction.guild!.id,
            targetMember,
            interaction.user,
            reason === "" ? "*No reason provided*" : reason,
            null,
            null,
            deleted.size.toString()
        );
    }
    const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger;
    const data = {
        meta: {
            type: "channelPurge",
            displayName: "Channel Purged",
            calculateType: "messageDelete",
            color: NucleusColors.red,
            emoji: "PUNISH.BAN.RED",
            timestamp: Date.now()
        },
        list: {
            memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
            purgedBy: entry(interaction.user.id, renderUser(interaction.user)),
            channel: entry(interaction.channel!.id, renderChannel(interaction.channel! as Discord.GuildChannel)),
            messagesCleared: entry(deleted.size.toString(), deleted.size.toString())
        },
        hidden: {
            guild: interaction.guild!.id
        }
    };
    await log(data);
    const messages: Message[] = deleted
        .map((m) => m)
        .filter((m) => m instanceof Message)
        .map((m) => m as Message);
    if (messages.length === 1) messageException(interaction.guild!.id, interaction.channel.id, messages[0]!.id);
    const messageArray: Message[] = messages
        .filter(
            (message) =>
                !message!.components.some((component) =>
                    component.components.some((child) => child.customId?.includes("transcript") ?? false)
                )
        )
        .map((message) => message as Message);
    const transcript = await client.database.transcripts.createTranscript(
        "purge",
        messageArray,
        interaction,
        interaction.member as GuildMember
    );

    const [code, key, iv] = await client.database.transcripts.create(transcript);

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
                new ButtonBuilder()
                    .setLabel("View")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://clicks.codes/nucleus/transcript/${code}?key=${key}&iv=${iv}`)
                    .setDisabled(!code)
            ])
        ]
    });
};

const check = async (_interaction: MessageContextMenuCommandInteraction) => {
    return true;
};

export { command, callback, check };
