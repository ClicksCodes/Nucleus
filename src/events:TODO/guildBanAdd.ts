import log from '../utils/log.js'

export const name = 'guildBanAdd'
export const once = false
export async function execute(ban) {
    let logs = await ban.guild.fetchAuditLogs({'type': 'MEMBER_BAN_CREATE'});
    let log = logs.entries.find(log => log.target.id === ban.user.id)

    let data = {
        id: ban.user.id,
        username: ban.user.username,
        reason: ban.reason,
        bannedAt: log.createdTimestamp,
        bannedBy: log.executor.id
    }

    log(ban.guild.id, data);
}