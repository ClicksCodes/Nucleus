const {addLog} = require('../scripts/addLogs');
module.exports = {
    name:'threadDelete',
    once:false,
    async execute(thread) {

        let logs = await thread.guild.fetchAuditLogs({type: 'THREAD_DELETE'});
        let entry = logs.entries.find(e => e.target.id === thread.id);

        let data = {
            autoArchiveDuration: thread.autoArchiveDuration,
            id: thread.id,
            locked: thread.locked,
            name: thread.name,
            parentChannel: thread.parent.id,
            slowmode: thread.rateLimitPerUser,
            type: thread.type,
            deletedAt: entry.createdTimestamp,
            deletedBy: entry.executor.id
        }

        addLog(thread.guild.id, data);

    }
}