import {
    AuditLogEvent,
    BaseGuildTextChannel,
    ChannelType,
    GuildAuditLogsEntry,
    GuildBasedChannel,
    StageChannel,
    ThreadChannel,
    VoiceChannel
} from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import getEmojiByName from "../utils/getEmojiByName.js";

export const event = "channelDelete";

export async function callback(client: NucleusClient, channel: GuildBasedChannel) {
    const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser } = client.logger;
    const auditLog = (await getAuditLog(channel.guild, AuditLogEvent.ChannelDelete))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as GuildBasedChannel)!.id === channel.id)[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;

    let emoji;
    let readableType;
    let displayName;
    switch (channel.type) {
        case ChannelType.GuildText: {
            emoji = "CHANNEL.TEXT.DELETE";
            readableType = "Text";
            displayName = "Text Channel";
            break;
        } case ChannelType.GuildAnnouncement: {
            emoji = "CHANNEL.TEXT.DELETE";
            readableType = "Announcement";
            displayName = "Announcement Channel";
            break;
        } case ChannelType.GuildVoice: {
            emoji = "CHANNEL.VOICE.DELETE";
            readableType = "Voice";
            displayName = "Voice Channel";
            break;
        } case ChannelType.GuildCategory: {
            emoji = "CHANNEL.CATEGORY.DELETE";
            readableType = "Category";
            displayName = "Category";
            break;
        } case ChannelType.GuildStageVoice: {
            emoji = "CHANNEL.VOICE.DELETE";
            readableType = "Stage";
            displayName = "Stage Channel";
            break;
        } case ChannelType.GuildForum: {
            emoji = "CHANNEL.TEXT.DELETE";
            readableType = "Forum";
            displayName = "Forum Channel";
            break;
        } default: {
            emoji = "CHANNEL.TEXT.DELETE";
            readableType = "Channel";
            displayName = "Channel";
        }
    }
    const list: {
        channelId: ReturnType<typeof entry>;
        name: ReturnType<typeof entry>;
        topic?: ReturnType<typeof entry> | null;
        type: ReturnType<typeof entry>;
        category: ReturnType<typeof entry>;
        nsfw?: ReturnType<typeof entry> | null;
        created: ReturnType<typeof entry>;
        deleted: ReturnType<typeof entry>;
        deletedBy: ReturnType<typeof entry>;
    } = {
        channelId: entry(channel.id, `\`${channel.id}\``),
        name: entry(channel.id, `${channel.name}`),
        topic: null,
        type: entry(channel.type, readableType),
        category: entry(
            channel.parent ? channel.parent.id : null,
            channel.parent ? channel.parent.name : "Uncategorised"
        ),
        nsfw: null,
        created: entry(channel.createdTimestamp, renderDelta(channel.createdTimestamp!)),
        deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
        deletedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!))
    };
    if ((channel instanceof BaseGuildTextChannel || channel instanceof StageChannel) && channel.topic !== null)
        list.topic = entry(channel.topic, `\`\`\`\n${channel.topic.replace("`", "'")}\n\`\`\``);
    else delete list.topic;
    if (
        channel instanceof BaseGuildTextChannel ||
        channel instanceof VoiceChannel ||
        channel instanceof ThreadChannel
    ) {
        const nsfw = channel instanceof ThreadChannel ? (channel as ThreadChannel).parent?.nsfw ?? false : channel.nsfw;
        list.nsfw = entry(
            nsfw,
            nsfw ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`
        );
    } else {
        delete list.nsfw;
    }

    const data = {
        meta: {
            type: "channelDelete",
            displayName: displayName + " Deleted",
            calculateType: "channelUpdate",
            color: NucleusColors.red,
            emoji: emoji,
            timestamp: auditLog.createdTimestamp
        },
        list: list,
        hidden: {
            guild: channel.guild.id
        }
    };
    log(data);
}
