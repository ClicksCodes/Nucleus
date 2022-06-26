import humanizeDuration from 'humanize-duration';
export const event = 'threadCreate'

export async function callback(client, thread) {
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = thread.client.logger
        let auditLog = await getAuditLog(thread.guild, 'THREAD_CREATE');
        let audit = auditLog.entries.filter(entry => entry.target.id == thread.id).first();
        if (audit.executor.id == client.user.id) return;
        let data = {
            meta: {
                type: 'channelCreate',
                displayName: 'Thread Created',
                calculateType: 'channelUpdate',
                color: NucleusColors.green,
                emoji: "CHANNEL.TEXT.CREATE",
                timestamp: thread.createdTimestamp
            },
            list: {
                id: entry(thread.id, `\`${thread.id}\``),
                name: entry(thread.name, renderChannel(thread)),
                parentChannel: entry(thread.parentId, renderChannel(thread.parent)),
                category: entry(thread.parent.parent ? thread.parent.parent.name : 'None', thread.parent.parent ? renderChannel(thread.parent.parent) : 'None'),
                autoArchiveDuration: entry(thread.autoArchiveDuration, humanizeDuration(thread.autoArchiveDuration * 60 * 1000, { round: true })),
                createdBy: entry(audit.executor.id, renderUser(audit.executor)),
                created: entry(thread.createdTimestamp, renderDelta(thread.createdTimestamp))
            },
            hidden: {
                guild: thread.guild.id
            }
        }
        log(data);
    } catch {}
}
