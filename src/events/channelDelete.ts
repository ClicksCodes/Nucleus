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
import _client, { NucleusClient } from "../utils/client.js";
import getEmojiByName from "../utils/getEmojiByName.js";

export const event = "channelDelete";

// function getPropFromObject(splitProp: string[], object: Record<string, unknown>) {
//     if (splitProp.length === 0) return null
//     if (splitProp.length === 1) {
//         return object[splitProp[0]!]
//     }
//     const property: string = splitProp[0]!
//     if (! Object.keys(object).includes(property)) return null;
//     splitProp = splitProp.splice(1)
//     return getPropFromObject(splitProp, object[property] as Record<string, unknown>)
// }

// async function deleteFromGuildConfig(channel: GuildBasedChannel) {
//     const guildConfig = await client.database.guilds.read(channel.guild.id);
//     const lists = [
//         "filters.wordFilter.allowed.channels",
//         "filters.invite.allowed.channels",
//         "filters.pings.allowed.channels",
//         "filters.clean.allowed.channels",
//         "filters.autoPublish.allowed.channels"
//     ]
//     const single = [
//         "welcome.channel",
//         "logging.logs.channel",
//         "logging.staff.channel",
//         "logging.attachments.channel",
//         "tickets.category"
//     ]
//     console.log(guildConfig, lists, single)
//     // for (const list of lists) {
//     //     const index = guildConfig[list].indexOf(channel.id);
//     //     if (index !== -1) guildConfig[list].splice(index, 1);
//     // }
// };

export async function callback(client: NucleusClient, channel: GuildBasedChannel) {
    // In future, please avoid using client from the outer scope. If you import client separately this
    // parameter should shadow it.

    // await deleteFromGuildConfig(channel)
    const { getAuditLog, log, isLogging, NucleusColors, entry, renderDelta, renderUser } = client.logger;
    if (!(await isLogging(channel.guild.id, "channelUpdate"))) return;
    const auditLog = (await getAuditLog(channel.guild, AuditLogEvent.ChannelDelete)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as GuildBasedChannel)!.id === channel.id
    )[0];
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
        }
        case ChannelType.GuildAnnouncement: {
            emoji = "CHANNEL.TEXT.DELETE";
            readableType = "Announcement";
            displayName = "Announcement Channel";
            break;
        }
        case ChannelType.GuildVoice: {
            emoji = "CHANNEL.VOICE.DELETE";
            readableType = "Voice";
            displayName = "Voice Channel";
            break;
        }
        case ChannelType.GuildCategory: {
            emoji = "CHANNEL.CATEGORY.DELETE";
            readableType = "Category";
            displayName = "Category";
            break;
        }
        case ChannelType.GuildStageVoice: {
            emoji = "CHANNEL.VOICE.DELETE";
            readableType = "Stage";
            displayName = "Stage Channel";
            break;
        }
        case ChannelType.GuildForum: {
            emoji = "CHANNEL.TEXT.DELETE";
            readableType = "Forum";
            displayName = "Forum Channel";
            break;
        }
        default: {
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
        deleted: entry(Date.now(), renderDelta(Date.now())),
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
    await log(data);
}
