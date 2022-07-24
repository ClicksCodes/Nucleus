import humanizeDuration from 'humanize-duration';
import { purgeByUser } from '../actions/tickets/delete.js';
import { callback as statsChannelRemove } from '../reflex/statsChannelRemove.js';

export const event = 'guildBanRemove';

export async function callback(client, ban) {
    try { await statsChannelRemove(client, ban.user); } catch {}
    try { purgeByUser(ban.user.id, ban.guild); } catch {}
    try {
        const { log, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = ban.user.client.logger
        let auditLog = await getAuditLog(ban.guild, 'MEMBER_BAN_REMOVE')
        let audit = auditLog.entries.filter(entry => entry.target.id == ban.user.id).first();
        if (audit.executor.id == client.user.id) return
        try { await client.database.history.create("unban", ban.guild.id, ban.user, audit.executor, audit.reason) } catch {}
        let data = {
            meta: {
                type: 'memberUnban',
                displayName: 'Member Unbanned',
                calculateType: 'guildMemberPunish',
                color: NucleusColors.green,
                emoji: "PUNISH.BAN.GREEN",
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(ban.user.id, `\`${ban.user.id}\``),
                name: entry(ban.user.id, renderUser(ban.user)),
                unbanned: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                unbannedBy: entry(audit.executor.id, renderUser(audit.executor)),
                accountCreated: entry(ban.user.createdAt, renderDelta(ban.user.createdAt)),
            },
            hidden: {
                guild: ban.guild.id
            }
        }
        log(data);
    } catch (e) {console.log(e)}
}
