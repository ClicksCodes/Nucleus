import { GuildChannel, AuditLogEvent, ChannelType, TextChannel, VoiceChannel, StageChannel } from "discord.js";
import type { GuildAuditLogsEntry } from "discord.js";
//@ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";
import { capitalize } from "../utils/generateKeyValueList.js";

let entry = client.logger.entry;

const channelTypeEmoji: Record<number, string> = {
    0: "Text", // Text channel
    2: "Voice", // Voice channel
    5: "Announcement", // Announcement channel
    13: "Stage", // Stage channel
    15: "Forum", // Forum channel
    99: "Rules" // Rules channel
};

// this eslint rule is invalid here, as the type definition is actually incorrect
// if you make it an interface due to the [key: string]: unknown line. Try it if you like :)
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type channelChanges = {
    channelId: ReturnType<typeof entry>;
    channel: ReturnType<typeof entry>;
    edited: ReturnType<typeof entry>;
    editedBy: ReturnType<typeof entry>;
    type?: ReturnType<typeof entry>;
    name?: ReturnType<typeof entry>;
    position?: ReturnType<typeof entry>;
    description?: ReturnType<typeof entry>;
    nsfw?: ReturnType<typeof entry>;
    slowmode?: ReturnType<typeof entry>;
    topic?: ReturnType<typeof entry>;
    bitrate?: ReturnType<typeof entry>;
    userLimit?: ReturnType<typeof entry>;
    parent?: ReturnType<typeof entry>;
    permissionOverwrites?: ReturnType<typeof entry>;
    region?: ReturnType<typeof entry>;
    maxUsers?: ReturnType<typeof entry>;
    autoArchiveDuration?: ReturnType<typeof entry>;
    [key: string]: unknown;
};

export const event = "channelUpdate";

export async function callback(_client: NucleusClient, oldChannel: GuildChannel, newChannel: GuildChannel) {
    const { getAuditLog, log, isLogging, NucleusColors, renderDelta, renderUser, renderChannel } = client.logger;
    if (!(await isLogging(newChannel.guild.id, "channelUpdate"))) return;
    const config = await client.memory.readGuildInfo(newChannel.guild.id);
    entry = client.logger.entry;
    if (newChannel.parent && newChannel.parent.id === config.tickets.category) return;

    const auditLog: null | GuildAuditLogsEntry<AuditLogEvent.ChannelUpdate> = (
        await getAuditLog(newChannel.guild, AuditLogEvent.ChannelUpdate)
    ).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as GuildChannel)!.id === newChannel.id
    )[0] as GuildAuditLogsEntry<AuditLogEvent.ChannelUpdate> | null;
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;

    let emoji: string;
    let readableType: string;
    let displayName: string;
    const changes: channelChanges = {
        channelId: entry(newChannel.id, `\`${newChannel.id}\``),
        channel: entry(newChannel.id, renderChannel(newChannel)),
        edited: entry(Date.now(), renderDelta(Date.now())),
        editedBy: entry(
            auditLog.executor!.id,
            renderUser((await newChannel.guild.members.fetch(auditLog.executor!.id)).user)
        )
    };
    if (oldChannel.name !== newChannel.name)
        changes.name = entry([oldChannel.name, newChannel.name], `${oldChannel.name} -> ${newChannel.name}`);
    if (oldChannel.position !== newChannel.position)
        changes.position = entry(
            [oldChannel.position.toString(), newChannel.position.toString()],
            `${oldChannel.position} -> ${newChannel.position}`
        );

    switch (newChannel.type) {
        case ChannelType.PrivateThread:
        case ChannelType.PublicThread: {
            return;
        }
        case ChannelType.GuildText: {
            emoji = "CHANNEL.TEXT.EDIT";
            readableType = "Text";
            displayName = "Text Channel";
            let oldTopic = (oldChannel as TextChannel).topic ?? "*None*",
                newTopic = (oldChannel as TextChannel).topic ?? "*None*";
            if (oldTopic) {
                if (oldTopic.length > 256)
                    oldTopic = `\`\`\`\n${oldTopic.replace("`", "'").substring(0, 253) + "..."}\n\`\`\``;
                else oldTopic = `\`\`\`\n${oldTopic.replace("`", "'")}\n\`\`\``;
            } else {
                oldTopic = "None";
            }
            if (newTopic) {
                if (newTopic.length > 256)
                    newTopic = `\`\`\`\n${newTopic.replace("`", "'").substring(0, 253) + "..."}\n\`\`\``;
                else newTopic = `\`\`\`\n${newTopic.replace("`", "'")}\n\`\`\``;
            } else {
                newTopic = "None";
            }
            const nsfw = ["", ""];
            nsfw[0] = (oldChannel as TextChannel).nsfw
                ? `${getEmojiByName("CONTROL.TICK")} Yes`
                : `${getEmojiByName("CONTROL.CROSS")} No`;
            nsfw[1] = (newChannel as TextChannel).nsfw
                ? `${getEmojiByName("CONTROL.TICK")} Yes`
                : `${getEmojiByName("CONTROL.CROSS")} No`;
            if (oldTopic !== newTopic)
                changes.description = entry(
                    [(oldChannel as TextChannel).topic ?? "", (newChannel as TextChannel).topic ?? ""],
                    `\nBefore: ${oldTopic}\nAfter: ${newTopic}`
                );
            if ((oldChannel as TextChannel).nsfw !== (newChannel as TextChannel).nsfw)
                changes.nsfw = entry(
                    [(oldChannel as TextChannel).nsfw ? "On" : "Off", (newChannel as TextChannel).nsfw ? "On" : "Off"],
                    `${nsfw[0]} -> ${nsfw[1]}`
                );
            if ((oldChannel as TextChannel).rateLimitPerUser !== (newChannel as TextChannel).rateLimitPerUser)
                changes.slowmode = entry(
                    [
                        (oldChannel as TextChannel).rateLimitPerUser.toString(),
                        (newChannel as TextChannel).rateLimitPerUser.toString()
                    ],
                    `${humanizeDuration((oldChannel as TextChannel).rateLimitPerUser * 1000)} -> ${humanizeDuration(
                        (newChannel as TextChannel).rateLimitPerUser * 1000
                    )}`
                );
            if (
                (oldChannel as TextChannel).defaultAutoArchiveDuration !==
                (newChannel as TextChannel).defaultAutoArchiveDuration
            ) {
                changes.autoArchiveDuration = entry(
                    [
                        ((oldChannel as TextChannel).defaultAutoArchiveDuration ?? 4320).toString(),
                        ((newChannel as TextChannel).defaultAutoArchiveDuration ?? 4320).toString()
                    ],
                    `${humanizeDuration(
                        ((oldChannel as TextChannel).defaultAutoArchiveDuration ?? 4320) * 60 * 1000
                    )} -> ${humanizeDuration(
                        ((newChannel as TextChannel).defaultAutoArchiveDuration ?? 4320) * 60 * 1000
                    )}`
                );
            }

            break;
        }
        case ChannelType.GuildAnnouncement: {
            emoji = "CHANNEL.TEXT.EDIT";
            readableType = "Announcement";
            displayName = "Announcement Channel";
            let oldTopic = (oldChannel as TextChannel).topic,
                newTopic = (newChannel as TextChannel).topic;
            if (oldTopic) {
                if (oldTopic.length > 256)
                    oldTopic = `\`\`\`\n${oldTopic.replace("`", "'").substring(0, 253) + "..."}\n\`\`\``;
                else oldTopic = `\`\`\`\n${oldTopic.replace("`", "'")}\n\`\`\``;
            } else {
                oldTopic = "None";
            }
            if (newTopic) {
                if (newTopic.length > 256)
                    newTopic = `\`\`\`\n${newTopic.replace("`", "'").substring(0, 253) + "..."}\n\`\`\``;
                else newTopic = `\`\`\`\n${newTopic.replace("`", "'")}\n\`\`\``;
            } else {
                newTopic = "None";
            }
            if ((oldChannel as TextChannel).nsfw !== (newChannel as TextChannel).nsfw) {
                changes.nsfw = entry(
                    [(oldChannel as TextChannel).nsfw ? "On" : "Off", (newChannel as TextChannel).nsfw ? "On" : "Off"],
                    `${(oldChannel as TextChannel).nsfw ? "On" : "Off"} -> ${
                        (newChannel as TextChannel).nsfw ? "On" : "Off"
                    }`
                );
            }
            if (
                (oldChannel as TextChannel).defaultAutoArchiveDuration !==
                (newChannel as TextChannel).defaultAutoArchiveDuration
            ) {
                changes.autoArchiveDuration = entry(
                    [
                        ((oldChannel as TextChannel).defaultAutoArchiveDuration ?? 4320).toString(),
                        ((newChannel as TextChannel).defaultAutoArchiveDuration ?? 4320).toString()
                    ],
                    `${humanizeDuration(
                        ((oldChannel as TextChannel).defaultAutoArchiveDuration ?? 4320) * 60 * 1000
                    )} -> ${humanizeDuration(
                        ((newChannel as TextChannel).defaultAutoArchiveDuration ?? 4320) * 60 * 1000
                    )}`
                );
            }
            break;
        }
        case ChannelType.GuildVoice: {
            emoji = "CHANNEL.VOICE.EDIT";
            readableType = "Voice";
            displayName = "Voice Channel";
            if ((oldChannel as VoiceChannel).bitrate !== (newChannel as VoiceChannel).bitrate)
                changes.bitrate = entry(
                    [(oldChannel as VoiceChannel).bitrate.toString(), (newChannel as VoiceChannel).bitrate.toString()],
                    `${(oldChannel as VoiceChannel).bitrate} -> ${(newChannel as VoiceChannel).bitrate}`
                );
            if ((oldChannel as VoiceChannel).userLimit !== (newChannel as VoiceChannel).userLimit)
                changes.maxUsers = entry(
                    [
                        (oldChannel as VoiceChannel).userLimit.toString(),
                        (newChannel as VoiceChannel).userLimit.toString()
                    ],
                    `${
                        (oldChannel as VoiceChannel).userLimit ? (oldChannel as VoiceChannel).userLimit : "Unlimited"
                    } -> ${(newChannel as VoiceChannel).userLimit}`
                );
            if ((oldChannel as VoiceChannel).rtcRegion !== (newChannel as VoiceChannel).rtcRegion)
                changes.region = entry(
                    [
                        (oldChannel as VoiceChannel).rtcRegion ?? "automatic",
                        (newChannel as VoiceChannel).rtcRegion ?? "automatic"
                    ],
                    `${capitalize(
                        (oldChannel as VoiceChannel).rtcRegion?.toUpperCase() ?? "automatic"
                    )} -> ${capitalize((newChannel as VoiceChannel).rtcRegion?.toUpperCase() ?? "automatic")}`
                );
            break;
        }
        case ChannelType.GuildStageVoice: {
            emoji = "CHANNEL.VOICE.EDIT";
            readableType = "Stage";
            displayName = "Stage Channel";
            let oldTopic = (oldChannel as StageChannel).topic,
                newTopic = (newChannel as StageChannel).topic;
            if (oldTopic) {
                if (oldTopic.length > 256)
                    oldTopic = `\`\`\`\n${oldTopic.replace("`", "'").substring(0, 253) + "..."}\n\`\`\``;
                else oldTopic = `\`\`\`\n${oldTopic.replace("`", "'")}\n\`\`\``;
            } else {
                oldTopic = "None";
            }
            if (newTopic) {
                if (newTopic.length > 256)
                    newTopic = `\`\`\`\n${newTopic.replace("`", "'").substring(0, 253) + "..."}\n\`\`\``;
                else newTopic = `\`\`\`\n${newTopic.replace("`", "'")}\n\`\`\``;
            } else {
                newTopic = "None";
            }
            if ((oldChannel as StageChannel).bitrate !== (newChannel as StageChannel).bitrate)
                changes.bitrate = entry(
                    [(oldChannel as StageChannel).bitrate.toString(), (newChannel as StageChannel).bitrate.toString()],
                    `${(oldChannel as StageChannel).bitrate} -> ${(newChannel as StageChannel).bitrate}`
                );
            if ((oldChannel as StageChannel).userLimit !== (newChannel as StageChannel).userLimit)
                changes.maxUsers = entry(
                    [
                        (oldChannel as StageChannel).userLimit.toString(),
                        (newChannel as StageChannel).userLimit.toString()
                    ],
                    `${
                        (oldChannel as StageChannel).userLimit ? (oldChannel as StageChannel).userLimit : "Unlimited"
                    } -> ${(newChannel as StageChannel).userLimit}`
                );
            if ((oldChannel as StageChannel).rtcRegion !== (newChannel as StageChannel).rtcRegion)
                changes.region = entry(
                    [
                        (oldChannel as StageChannel).rtcRegion ?? "Automatic",
                        (newChannel as StageChannel).rtcRegion ?? "Automatic"
                    ],
                    `${capitalize(
                        (oldChannel as StageChannel).rtcRegion?.toLowerCase() ?? "automatic"
                    )} -> ${capitalize((newChannel as StageChannel).rtcRegion?.toLowerCase() ?? "automatic")}`
                );
            break;
        }
        case ChannelType.GuildCategory: {
            emoji = "CHANNEL.CATEGORY.EDIT";
            readableType = "Category";
            displayName = "Category";
            break;
        }
        default: {
            emoji = "CHANNEL.TEXT.EDIT";
            readableType = "Channel";
            displayName = "Channel";
        }
    }
    const ocType = channelTypeEmoji[oldChannel.type],
        ncType = channelTypeEmoji[newChannel.type];
    if (oldChannel.type !== newChannel.type) changes.type = entry([ocType!, ncType!], `${ocType!} -> ${readableType}`);
    if (!(Object.values(changes).length - 4)) return;
    const data = {
        meta: {
            type: "channelUpdate",
            displayName: displayName + " Edited",
            calculateType: "channelUpdate",
            color: NucleusColors.yellow,
            emoji: emoji,
            timestamp: auditLog.createdTimestamp
        },
        list: changes,
        hidden: {
            guild: newChannel.guild.id
        }
    };
    await log(data);
}
