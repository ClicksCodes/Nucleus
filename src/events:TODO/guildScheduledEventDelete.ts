const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'guildScheduledEventDelete',
    once:false,
    async execute(event) {

        let logs = await event.guild.fetchAuditLogs({'type': 'GUILD_SCHEDULED_EVENT_DELETE'});
        let log = logs.entries.find(log => log.target.id === event.id);

        let data = {
            id: event.id,
            name: event.name,
            deletedAt: log.createdTimestamp,
            deletedBy: log.executor.id
        }

        addLog(event.guild.id, data);
    }
}