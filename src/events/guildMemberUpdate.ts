import { callback as statsChannelAdd } from '../automations/statsChannelAdd.js';
import { callback as welcome } from '../automations/welcome.js';
import log from '../utils/log.js';
export const event = 'guildMemberUpdate'

export async function callback(client, before, after) {
    try {
        const { log, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = after.client.logger
        if (before.nickname != after.nickname) {
            let auditLog = await getAuditLog(after.guild, 'MEMBER_UPDATE');
            let audit = auditLog.entries.filter(entry => entry.target.id == after.id).first();
            if (audit.executor.id == client.user.id) return;
            try { await client.database.history.create(
                "nickname", after.guild.id, after.user, audit.executor,
                null, before.nickname || before.user.username, after.nickname || after.user.username) } catch {}
            let data = {
                meta: {
                    type: 'memberUpdate',
                    displayName: 'Nickname Changed',
                    calculateType: 'guildMemberUpdate',
                    color: NucleusColors.yellow,
                    emoji: "PUNISH.NICKNAME.YELLOW",
                    timestamp: new Date().getTime()
                },
                list: {
                    memberId: entry(after.id, `\`${after.id}\``),
                    before: entry(before.nickname, before.nickname ? before.nickname : '*None*'),
                    after: entry(after.nickname, after.nickname ? after.nickname : '*None*'),
                    updated: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    updatedBy: entry(audit.executor.id, renderUser(audit.executor))
                },
                hidden: {
                    guild: after.guild.id
                }
            }
            log(data);
        }
    } catch (e) { console.log(e) }
}
