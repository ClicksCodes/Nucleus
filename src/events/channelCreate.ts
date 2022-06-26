export const event = 'channelCreate'

export async function callback(client, channel) {
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = channel.client.logger
        let auditLog = await getAuditLog(channel.guild, 'CHANNEL_CREATE');
        let audit = auditLog.entries.filter(entry => entry.target.id == channel.id).first();
        if (audit.executor.id == client.user.id) return;
        let emoji;
        let readableType;
        let displayName;
        switch (channel.type) {
            case 'GUILD_TEXT': {
                emoji = "CHANNEL.TEXT.CREATE";
                readableType = "Text";
                displayName = "Text Channel"
                break;
            }
            case 'GUILD_NEWS': {
                emoji = "CHANNEL.TEXT.CREATE";
                readableType = "Announcement";
                displayName = "Announcement Channel"
                break;
            }
            case 'GUILD_VOICE': {
                emoji = "CHANNEL.VOICE.CREATE";
                readableType = "Voice";
                displayName = "Voice Channel"
                break;
            }
            case 'GUILD_STAGE': {
                emoji = "CHANNEL.VOICE.CREATE";
                readableType = "Stage";
                displayName = "Stage Channel"
            }
            case 'GUILD_CATEGORY': {
                emoji = "CHANNEL.CATEGORY.CREATE";
                readableType = "Category";
                displayName = "Category"
                break;
            }
            default: {
                emoji = "CHANNEL.TEXT.CREATE";
                readableType = "Channel";
                displayName = "Channel"
            }
        }
        let data = {
            meta: {
                type: 'channelCreate',
                displayName: displayName + ' Created',
                calculateType: 'channelUpdate',
                color: NucleusColors.green,
                emoji: emoji,
                timestamp: channel.createdTimestamp
            },
            list: {
                id: entry(channel.id, `\`${channel.id}\``),
                name: entry(channel.name, renderChannel(channel)),
                type: entry(channel.type, readableType),
                category: entry(channel.parent ? channel.parent.id : null, channel.parent ? channel.parent.name : "Uncategorised"),
                createdBy: entry(audit.executor.id, renderUser(audit.executor)),
                created: entry(channel.createdTimestamp, renderDelta(channel.createdTimestamp))
            },
            hidden: {
                guild: channel.guild.id
            }
        }
        log(data);
    } catch {}
}
