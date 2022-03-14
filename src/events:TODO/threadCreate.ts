const {addLog} = require('../scripts/addLogs');
module.exports = {
    name:'threadCreate',
    once:false,
    async execute(thread) {

        let data = {
            autoArchiveDuration: thread.autoArchiveDuration,
            id: thread.id,
            locked: thread.locked,
            name: thread.name,
            parentChannel: thread.parent.id,
            slowmode: thread.rateLimitPerUser,
            type: thread.type,
            createdAt: thread.createdTimestamp,
            createdBy: thread.ownerId
        }

        addLog(thread.guild.id, data);

    }
}