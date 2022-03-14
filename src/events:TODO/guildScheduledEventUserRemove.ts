const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'guildScheduledEventUserRemove',
    once:false,
    async execute(event, member) {
        let data = {
            event: {
                id: event.id,
                name: event.name,
            },
            user: {
                id: member.id,
                username: member.username,
                leftEventAt: Date.now()
            }
        }
        addLog(event.guild.id, data);
    }
}