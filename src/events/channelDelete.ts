import getEmojiByName from "../utils/getEmojiByName.js";

export const event = 'channelDelete'

export async function callback(client, channel) {
    try{
        const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser } = channel.client.logger

        let auditLog = await getAuditLog(channel.guild, 'CHANNEL_DELETE');
        let audit = auditLog.entries.filter(entry => entry.target.id == channel.id).first();
        if (audit.executor.id == client.user.id) return;

        let emoji;
        let readableType;
        let displayName;
        switch (channel.type) {
            case 'GUILD_TEXT': {
                emoji = "CHANNEL.TEXT.DELETE";
                readableType = "Text";
                displayName = "Text Channel"
                break;
            }
            case 'GUILD_VOICE': {
                emoji = "CHANNEL.VOICE.DELETE";
                readableType = "Voice";
                displayName = "Voice Channel"
                break;
            }
            case 'GUILD_CATEGORY': {
                emoji = "CHANNEL.CATEGORY.DELETE";
                readableType = "Category";
                displayName = "Category"
                break;
            }
            default: {
                emoji = "CHANNEL.TEXT.DELETE";
                readableType = "Channel";
                displayName = "Channel"
            }
        }
        let list = {
            id: entry(channel.id, `\`${channel.id}\``),
            name: entry(channel.id, `${channel.name}`),
            topic: null,
            type: entry(channel.type, readableType),
            category: entry(channel.parent ? channel.parent.id : null, channel.parent ? channel.parent.name : "Uncategorised"),
            nsfw: null,
            created: entry(channel.createdTimestamp, renderDelta(channel.createdTimestamp)),
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
            deletedBy: entry(audit.executor.id, renderUser(audit.executor))
        }
        if (channel.topic != null ?? false) list.topic = entry(channel.topic, `\`\`\`\n${channel.topic.replace('`', "'")}\n\`\`\``);
        else delete list.topic;
        if (channel.nsfw !== null ?? false) list.nsfw = entry(channel.nsfw, channel.nsfw ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`);
        else delete list.nsfw;

        let data = {
            meta:{
                type: 'channelDelete',
                displayName: displayName + ' Deleted',
                calculateType: 'channelUpdate',
                color: NucleusColors.red,
                emoji: emoji,
                timestamp: audit.createdTimestamp
            },
            list: list,
            hidden: {
                guild: channel.guild.id
            }
        }
        log(data, channel.client);
    } catch {}
}
