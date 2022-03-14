const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'inviteDelete',
    once:false,
    async execute(invite) {

        let logs = await invite.guild.fetchAuditLogs({type: 'INVITE_DELETE'});
        let entry = logs.entries.find(e => e.target.code === invite.code);

        let data = {
            channel: invite.channel.id,
            code: invite.code,
            deletedAt: invite.deletedTimestamp,
            deletedBy: entry.executor.id
        }

        addLog(invite.guild.id, data)

    }
}