const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'guildScheduledEventCreate',
    once:false,
    async execute(event) {
        let data = {
            id: event.id,
            name: event.name,
            description: event.description,
            channel: event.channel.id,
            time: {
                start: event.scheduledStartTimestamp,
                end: event.scheduledEndTimestamp
            },
            date: event.date,
            createdBy: event.creator.id,
            createdAt: event.createdTimestamp,
            privacyLevel: event.privacyLevel
        }

        addLog(event.guild.id, data);
    }
}