import { GuildChannel, AuditLogEvent } from 'discord.js';
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";
import getEmojiByName from "../utils/getEmojiByName.js";

export const event = "channelUpdate";

export async function callback(client: NucleusClient, oldChannel: GuildChannel, newChannel: GuildChannel) {
    const config = await client.memory.readGuildInfo(newChannel.guild.id);
    const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser, renderChannel } = client.logger;

    if (newChannel.parent && newChannel.parent.id === config.tickets.category) return;

    const auditLog = await getAuditLog(newChannel.guild, "CHANNEL_UPDATE");
    const audit = auditLog.entries.filter((entry) => entry.target.id === newChannel.id).first();
    if (audit.executor.id === client.user.id) return;

    let emoji: string;
    let readableType: string;
    let displayName: string;
    const changes = {
        channelId: entry(newChannel.id, `\`${newChannel.id}\``),
        channel: entry(newChannel.id, renderChannel(newChannel)),
        edited: entry(new Date().getTime(), renderDelta(new Date().getTime())),
        editedBy: entry(audit.executor.id, renderUser((await newChannel.guild.members.fetch(audit.executor.id)).user))
    };
    if (oldChannel.name !== newChannel.name) changes.name = entry([oldChannel.name, newChannel.name], `${oldChannel.name} -> ${newChannel.name}`);
    if (oldChannel.position !== newChannel.position)
        changes.position = entry([oldChannel.position, newChannel.position], `${oldChannel.position} -> ${newChannel.position}`);

    switch (newChannel.type) {
        case "GUILD_TEXT": {
            emoji = "CHANNEL.TEXT.EDIT";
            readableType = "Text";
            displayName = "Text Channel";
            let oldTopic = oldChannel.topic,
                newTopic = newChannel.topic;
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
            nsfw[0] = oldChannel.nsfw ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
            nsfw[1] = newChannel.nsfw ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
            if (oldChannel.topic !== newChannel.topic)
                changes.description = entry([oldChannel.topic, newChannel.topic], `\nBefore: ${oldTopic}\nAfter: ${newTopic}`);
            if (oldChannel.nsfw !== newChannel.nsfw) changes.nsfw = entry([oldChannel.nsfw, newChannel.nsfw], `${nsfw[0]} -> ${nsfw[1]}`);
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
                changes.rateLimitPerUser = entry(
                    [oldChannel.rateLimitPerUser, newChannel.rateLimitPerUser],
                    `${humanizeDuration(oldChannel.rateLimitPerUser * 1000)} -> ${humanizeDuration(newChannel.rateLimitPerUser * 1000)}`
                );

            break;
        }
        case "GUILD_NEWS": {
            emoji = "CHANNEL.TEXT.EDIT";
            readableType = "News";
            displayName = "News Channel";
            let oldTopic = oldChannel.topic,
                newTopic = newChannel.topic;
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
            if (oldChannel.nsfw !== newChannel.nsfw)
                changes.nsfw = entry([oldChannel.nsfw, newChannel.nsfw], `${oldChannel.nsfw ? "On" : "Off"} -> ${newChannel.nsfw ? "On" : "Off"}`);
            break;
        }
        case "GUILD_VOICE": {
            emoji = "CHANNEL.VOICE.EDIT";
            readableType = "Voice";
            displayName = "Voice Channel";
            if (oldChannel.bitrate !== newChannel.bitrate)
                changes.bitrate = entry([oldChannel.bitrate, newChannel.bitrate], `${oldChannel.bitrate} -> ${newChannel.bitrate}`);
            if (oldChannel.userLimit !== newChannel.userLimit)
                changes.maxUsers = entry(
                    [oldChannel.userLimit, newChannel.userLimit],
                    `${oldChannel.userLimit ? oldChannel.userLimit : "Unlimited"} -> ${newChannel.userLimit}`
                );
            if (oldChannel.rtcRegion !== newChannel.rtcRegion)
                changes.region = entry(
                    [oldChannel.rtcRegion, newChannel.rtcRegion],
                    `${oldChannel.rtcRegion || "Automatic"} -> ${newChannel.rtcRegion || "Automatic"}`
                );
            break;
        }
        case "GUILD_STAGE": {
            emoji = "CHANNEL.VOICE.EDIT";
            readableType = "Stage";
            displayName = "Stage Channel";
            let oldTopic = oldChannel.topic,
                newTopic = newChannel.topic;
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
            if (oldChannel.bitrate !== newChannel.bitrate)
                changes.bitrate = entry([oldChannel.bitrate, newChannel.bitrate], `${oldChannel.bitrate} -> ${newChannel.bitrate}`);
            if (oldChannel.userLimit !== newChannel.userLimit)
                changes.maxUsers = entry(
                    [oldChannel.userLimit, newChannel.userLimit],
                    `${oldChannel.userLimit ? oldChannel.userLimit : "Unlimited"} -> ${newChannel.userLimit}`
                );
            if (oldChannel.rtcRegion !== newChannel.rtcRegion)
                changes.region = entry(
                    [oldChannel.rtcRegion, newChannel.rtcRegion],
                    `${oldChannel.rtcRegion || "Automatic"} -> ${newChannel.rtcRegion || "Automatic"}`
                );
            break;
        }
        case "GUILD_CATEGORY": {
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
    const t = oldChannel.type.split("_")[1];
    if (oldChannel.type !== newChannel.type)
        changes.type = entry([oldChannel.type, newChannel.type], `${t[0] + t.splice(1).toLowerCase()} -> ${readableType}`);
    if (!(Object.values(changes).length - 4)) return;
    const data = {
        meta: {
            type: "channelUpdate",
            displayName: displayName + " Edited",
            calculateType: "channelUpdate",
            color: NucleusColors.yellow,
            emoji: emoji,
            timestamp: audit.createdTimestamp
        },
        list: changes,
        hidden: {
            guild: newChannel.guild.id
        }
    };
    log(data);
}
