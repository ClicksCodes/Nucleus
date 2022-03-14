const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');

module.exports = {
    name:'guildScheduledEventUpdate',
    once:false,
    async execute(oldEvent, newEvent) {
        let oe = {
            id: oldEvent.id,
            name: oldEvent.name,
            description: oldEvent.description,
            channel: oldEvent.channel ? oldEvent.channel.id : null,
            time: {
                start: oldEvent.scheduledStartTimestamp,
                end: oldEvent.scheduledEndTimestamp
            },
            date: oldEvent.date,
            privacyLevel: oldEvent.privacyLevel,
            entityType: oldEvent.entityType,
            entityMetadata: oldEvent.entityMetadata,
            status: oldEvent.status
        }
        let ne = {
            id: newEvent.id,
            name: newEvent.name,
            description: newEvent.description,
            channel: newEvent.channel ? newEvent.channel.id : null,
            time: {
                start: newEvent.scheduledStartTimestamp,
                end: newEvent.scheduledEndTimestamp
            },
            date: newEvent.date,
            privacyLevel: newEvent.privacyLevel,
            entityType: newEvent.entityType,
            entityMetadata: newEvent.entityMetadata,
            status: newEvent.status
        }

        let data = JsonDiff.diff(oe, ne, {full: true});

        addLog(newEvent.guild.id, data);
    }
}