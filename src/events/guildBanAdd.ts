import { purgeByUser } from '../automations/tickets/delete.js';
import { callback as statsChannelRemove } from '../automations/statsChannelRemove.js';

export const event = 'guildBanAdd';

export async function callback(client, ban) {
    try { await statsChannelRemove(client, ban.user); } catch {}
    try { purgeByUser(ban.user.id, ban.guild); } catch {}
    try {
        const { log, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = ban.user.client.logger
        let auditLog = await getAuditLog(ban.guild, 'MEMBER_BAN_ADD')
        let audit = auditLog.entries.filter(entry => entry.target.id == ban.user.id).first();
        if (audit.executor.id == client.user.id) return
        try { await client.database.history.create("ban", ban.guild.id, ban.user, audit.executor, audit.reason) } catch {}
        let data = {
            meta: {
                type: 'memberBan',
                displayName: 'Member Banned',
                calculateType: 'guildMemberPunish',
                color: NucleusColors.red,
                emoji: "PUNISH.BAN.RED",
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(ban.user.id, `\`${ban.user.id}\``),
                name: entry(ban.user.id, renderUser(ban.user)),
                banned: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                bannedBy: entry(audit.executor.id, renderUser(audit.executor)),
                reason: entry(audit.reason, audit.reason ? `\n> ${audit.reason}` : "*No reason provided.*"),
                accountCreated: entry(ban.user.createdAt, renderDelta(ban.user.createdAt)),
                serverMemberCount: ban.guild.memberCount,
            },
            hidden: {
                guild: ban.guild.id
            }
        }
        log(data);
    } catch {}
}
