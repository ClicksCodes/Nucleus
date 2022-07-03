export const event = 'stickerDelete'

export async function callback(client, emoji) {
    try{
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = emoji.client.logger
        let auditLog = await getAuditLog(emoji.guild, 'STICKER_DELETE');
        let audit = auditLog.entries.filter(entry => entry.target.id == emoji.id).first();
        if (audit.executor.id == client.user.id) return;
        let data = {
            meta: {
                type: 'stickerDelete',
                displayName: 'Sticker Deleted',
                calculateType: 'stickerUpdate',
                color: NucleusColors.red,
                emoji: "GUILD.EMOJI.DELETE",
                timestamp: audit.createdTimestamp,
            },
            list: {
                stickerId:entry(emoji.id, `\`${emoji.id}\``),
                sticker: entry(emoji.name, `\`${emoji.name}\``),
                deletedBy: entry(audit.executor.id, renderUser(audit.executor)),
                created: entry(emoji.createdTimestamp, renderDelta(emoji.createdTimestamp)),
                deleted: entry(audit.createdTimestamp, renderDelta(audit.createdTimestamp)),
            },
            hidden: {
                guild: emoji.guild.id
            }
        }
        log(data);
    } catch {}
}
