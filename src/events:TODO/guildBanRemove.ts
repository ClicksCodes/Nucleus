module.exports = {
    name:'guilidBanRemove',
    once:false,
    async execute(ban) {
        let logs = await ban.guild.fetchAuditLogs({'type': 'MEMBER_BAN_REMOVE'});
        let log = logs.entries.find(log => log.target.id === ban.user.id);

        let data = {
            id: ban.user.id,
            username: ban.user.username,
            reason: ban.reason,
            unbannedAt: log.createdTimestamp,
            unbannedBy: log.executor.id
        }

        addLog(ban.guild.id, data);
    }
}