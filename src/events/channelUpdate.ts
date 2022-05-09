import humanizeDuration from 'humanize-duration';
import getEmojiByName from '../utils/getEmojiByName.js';

export const event = 'channelUpdate';

export async function callback(client, oc, nc) {
    try {
        let config = await client.memory.readGuildInfo(nc.guild.id);
        const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser, renderChannel } = client.logger

        if (nc.parent && (nc.parent.id == config.tickets.category)) return

        let auditLog = await getAuditLog(nc.guild, 'CHANNEL_UPDATE');
        let audit = auditLog.entries.filter(entry => entry.target.id == nc.id).first();
        if (audit.executor.id == client.user.id) return;

        let emoji:string;
        let readableType:string;
        let displayName:string ;
        let changes = {
            id: entry(nc.id, `\`${nc.id}\``),
            channel: entry(nc.id, renderChannel(nc)),
            edited: entry(new Date().getTime(), renderDelta(new Date().getTime())),
            editedBy: entry(audit.executor.id, renderUser((await nc.guild.members.fetch(audit.executor.id)).user)),
        }
        if (oc.name != nc.name) changes["name"] = entry([oc.name, nc.name], `${oc.name} -> ${nc.name}`);
        if (oc.position != nc.position) changes["position"] = entry([oc.position, nc.position], `${oc.position} -> ${nc.position}`);

        switch (nc.type) {
            case 'GUILD_TEXT': {
                emoji = "CHANNEL.TEXT.EDIT";
                readableType = "Text";
                displayName = "Text Channel"
                let oldTopic = oc.topic, newTopic = nc.topic;
                if (oldTopic) {
                    if (oldTopic.length > 256) oldTopic = `\`\`\`\n${oldTopic.replace('`', "'").substring(0, 253) + '...'}\n\`\`\``
                    else oldTopic = `\`\`\`\n${oldTopic.replace('`', "'")}\n\`\`\``
                } else { oldTopic = "None"; }
                if (newTopic) {
                    if (newTopic.length > 256) newTopic = `\`\`\`\n${newTopic.replace('`', "'").substring(0, 253) + '...'}\n\`\`\``
                    else newTopic = `\`\`\`\n${newTopic.replace('`', "'")}\n\`\`\``
                } else { newTopic = "None"; }
                let nsfw = ["", ""]
                nsfw[0] = oc.nsfw ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
                nsfw[1] = nc.nsfw ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
                if (oc.topic != nc.topic) changes["description"] = entry([oc.topic, nc.topic], `\nBefore: ${oldTopic}\nAfter: ${newTopic}`);
                if (oc.nsfw != nc.nsfw) changes["nsfw"] = entry([oc.nsfw, nc.nsfw], `${nsfw[0]} -> ${nsfw[1]}`);
                if (oc.rateLimitPerUser != nc.rateLimitPerUser) changes["rateLimitPerUser"] = entry(
                    [oc.rateLimitPerUser, nc.rateLimitPerUser],
                    `${humanizeDuration(oc.rateLimitPerUser * 1000)} -> ${humanizeDuration(nc.rateLimitPerUser * 1000)}`
                );

                break;
            }
            case 'GUILD_NEWS': {
                emoji = "CHANNEL.TEXT.EDIT";
                readableType = "News";
                displayName = "News Channel"
                let oldTopic = oc.topic, newTopic = nc.topic;
                if (oldTopic) {
                    if (oldTopic.length > 256) oldTopic = `\`\`\`\n${oldTopic.replace('`', "'").substring(0, 253) + '...'}\n\`\`\``
                    else oldTopic = `\`\`\`\n${oldTopic.replace('`', "'")}\n\`\`\``
                } else { oldTopic = "None"; }
                if (newTopic) {
                    if (newTopic.length > 256) newTopic = `\`\`\`\n${newTopic.replace('`', "'").substring(0, 253) + '...'}\n\`\`\``
                    else newTopic = `\`\`\`\n${newTopic.replace('`', "'")}\n\`\`\``
                } else { newTopic = "None"; }
                if (oc.nsfw != nc.nsfw) changes["nsfw"] = entry([oc.nsfw, nc.nsfw], `${oc.nsfw ? "On" : "Off"} -> ${nc.nsfw ? "On" : "Off"}`);
                break;
            }
            case 'GUILD_VOICE': {
                emoji = "CHANNEL.VOICE.EDIT";
                readableType = "Voice";
                displayName = "Voice Channel"
                if (oc.bitrate != nc.bitrate) changes["bitrate"] = entry([oc.bitrate, nc.bitrate], `${oc.bitrate} -> ${nc.bitrate}`);
                if (oc.userLimit != nc.userLimit) changes["maxUsers"] = entry([oc.userLimit, nc.userLimit], `${oc.userLimit ? oc.userLimit : "Unlimited"} -> ${nc.userLimit}`);
                if (oc.rtcRegion != nc.rtcRegion) changes["region"] = entry(
                    [oc.rtcRegion, nc.rtcRegion],
                    `${oc.rtcRegion || "Automatic"} -> ${nc.rtcRegion || "Automatic"}`
                );
                break;
            }
            case 'GUILD_STAGE': {
                emoji = "CHANNEL.VOICE.EDIT";
                readableType = "Stage";
                displayName = "Stage Channel"
                let oldTopic = oc.topic, newTopic = nc.topic;
                if (oldTopic) {
                    if (oldTopic.length > 256) oldTopic = `\`\`\`\n${oldTopic.replace('`', "'").substring(0, 253) + '...'}\n\`\`\``
                    else oldTopic = `\`\`\`\n${oldTopic.replace('`', "'")}\n\`\`\``
                } else { oldTopic = "None"; }
                if (newTopic) {
                    if (newTopic.length > 256) newTopic = `\`\`\`\n${newTopic.replace('`', "'").substring(0, 253) + '...'}\n\`\`\``
                    else newTopic = `\`\`\`\n${newTopic.replace('`', "'")}\n\`\`\``
                } else { newTopic = "None"; }
                if (oc.bitrate != nc.bitrate) changes["bitrate"] = entry([oc.bitrate, nc.bitrate], `${oc.bitrate} -> ${nc.bitrate}`);
                if (oc.userLimit != nc.userLimit) changes["maxUsers"] = entry([oc.userLimit, nc.userLimit], `${oc.userLimit ? oc.userLimit : "Unlimited"} -> ${nc.userLimit}`);
                if (oc.rtcRegion != nc.rtcRegion) changes["region"] = entry(
                    [oc.rtcRegion, nc.rtcRegion],
                    `${oc.rtcRegion || "Automatic"} -> ${nc.rtcRegion || "Automatic"}`
                );
                break;
            }
            case 'GUILD_CATEGORY': {
                emoji = "CHANNEL.CATEGORY.EDIT";
                readableType = "Category";
                displayName = "Category"
                break;
            }
            default: {
                emoji = "CHANNEL.TEXT.EDIT";
                readableType = "Channel";
                displayName = "Channel"
            }
        }
        let t = oc.type.split("_")[1];
        if (oc.type != nc.type) changes["type"] = entry([oc.type, nc.type], `${t[0] + t.splice(1).toLowerCase()} -> ${readableType}`);
        if (!(Object.values(changes).length - 4)) return
        let data = {
            meta:{
                type: 'channelUpdate',
                displayName: displayName + ' Edited',
                calculateType: 'channelUpdate',
                color: NucleusColors.yellow,
                emoji: emoji,
                timestamp: audit.createdTimestamp
            },
            list: changes,
            hidden: {
                guild: nc.guild.id
            }
        }
        log(data, client);
    } catch {}
}