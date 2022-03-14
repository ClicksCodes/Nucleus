const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'messageDeleteBulk',
    once:false,
    async execute(messages) {

        let logs = await messages.first().guild.fetchAuditLogs({type: 'MESSAGE_DELETE_BULK'});
        let entry = logs.entries.first();

        let data = {
            messages:messages.map(message=>{
                return {
                    id:message.id,
                    channel:message.channel.id,
                    content:message.content
                }
            }),
            deletedBy:entry.executor.id,
            deletedAt:entry.createdAt
        }

        addLog(messages.first().guild.id, data);
    }
}