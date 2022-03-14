const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'guildScheduledEventUserAdd',
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
                joinedEventAt: Date.now()
            }
        }
        addLog(event.guild.id, data);
    }
}