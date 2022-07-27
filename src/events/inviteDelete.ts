import humanizeDuration from 'humanize-duration';
export const event = 'inviteDelete'

export async function callback(client, invite) {
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = invite.client.logger
        let auditLog = await getAuditLog(invite.guild, 'INVITE_DELETE');
        let audit = auditLog.entries.filter(entry => entry.target.id === invite.id).first();
        if (audit.executor.id === client.user.id) return;
        let data = {
            meta: {
                type: 'inviteDelete',
                displayName: 'Invite Deleted',
                calculateType: 'guildUpdate',
                color: NucleusColors.red,
                emoji: "INVITE.DELETE",
                timestamp: new Date().getTime()
            },
            list: {
                channel: entry(invite.channel.id, renderChannel(invite.channel)),
                link: entry(invite.url, invite.url),
                expires: entry(invite.maxAge, invite.maxAge ? humanizeDuration(invite.maxAge * 1000) : 'Never'),
                deletedBy: entry(audit.executor.id, renderUser(audit.executor)),
                deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
            },
            hidden: {
                guild: invite.guild.id
            }
        }
        log(data);
    } catch {}
}
