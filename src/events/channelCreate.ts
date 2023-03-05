import { AuditLogEvent, ChannelType, GuildAuditLogsEntry } from "discord.js";
import type { GuildBasedChannel } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
export const event = "channelCreate";

export async function callback(client: NucleusClient, channel: GuildBasedChannel) {
    const { getAuditLog, log, isLogging, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    if (!(await isLogging(channel.guild.id, "channelUpdate"))) return;
    const auditLog = (await getAuditLog(channel.guild, AuditLogEvent.ChannelCreate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as GuildBasedChannel)!.id === channel.id
    )[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;
    let emoji;
    let readableType;
    let displayName;
    switch (channel.type) {
        case ChannelType.GuildText: {
            emoji = "CHANNEL.TEXT.CREATE";
            readableType = "Text";
            displayName = "Text Channel";
            break;
        }
        case ChannelType.GuildAnnouncement: {
            emoji = "CHANNEL.TEXT.CREATE";
            readableType = "Announcement";
            displayName = "Announcement Channel";
            break;
        }
        case ChannelType.GuildVoice: {
            emoji = "CHANNEL.VOICE.CREATE";
            readableType = "Voice";
            displayName = "Voice Channel";
            break;
        }
        case ChannelType.GuildStageVoice: {
            emoji = "CHANNEL.VOICE.CREATE";
            readableType = "Stage";
            displayName = "Stage Channel";
            break;
        }
        case ChannelType.GuildCategory: {
            emoji = "CHANNEL.CATEGORY.CREATE";
            readableType = "Category";
            displayName = "Category";
            break;
        }
        case ChannelType.GuildForum: {
            emoji = "CHANNEL.TEXT.CREATE";
            readableType = "Forum";
            displayName = "Forum Channel";
            break;
        }
        default: {
            emoji = "CHANNEL.TEXT.CREATE";
            readableType = "Channel";
            displayName = "Channel";
        }
    }
    const data = {
        meta: {
            type: "channelCreate",
            displayName: displayName + " Created",
            calculateType: "channelUpdate",
            color: NucleusColors.green,
            emoji: emoji,
            timestamp: channel.createdTimestamp ?? Date.now()
        },
        list: {
            channelId: entry(channel.id, `\`${channel.id}\``),
            name: entry(channel.name, renderChannel(channel)),
            type: entry(channel.type, readableType),
            category: entry(
                channel.parent ? channel.parent.id : null,
                channel.parent ? channel.parent.name : "Uncategorised"
            ),
            createdBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(channel.createdTimestamp, renderDelta(channel.createdTimestamp!))
        },
        hidden: {
            guild: channel.guild.id
        }
    };
    log(data);
}
