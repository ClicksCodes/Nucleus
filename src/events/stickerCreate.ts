export const event = 'stickerCreate'

export async function callback(client, emoji) {
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = emoji.client.logger
        let auditLog = await getAuditLog(emoji.guild, 'STICKER_CREATE');
        let audit = auditLog.entries.filter(entry => entry.target.id == emoji.id).first();
        if (audit.executor.id == client.user.id) return;
        let data = {
            meta: {
                type: 'stickerCreate',
                displayName: 'Sticker Created',
                calculateType: 'stickerUpdate',
                color: NucleusColors.green,
                emoji: "GUILD.EMOJI.CREATE",
                timestamp: emoji.createdTimestamp
            },
            list: {
                stickerId: entry(emoji.id, `\`${emoji.id}\``),
                emoji: entry(emoji.name, `\`:${emoji.name}:\``),
                createdBy: entry(audit.executor.id, renderUser(audit.executor)),
                created: entry(emoji.createdTimestamp, renderDelta(emoji.createdTimestamp))
            },
            hidden: {
                guild: emoji.guild.id
            }
        }
        log(data);
    } catch {}
}
