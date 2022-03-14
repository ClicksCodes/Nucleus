const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');
module.exports = {
    name:'threadUpdate',
    once:false,
    async execute(oldThread, newThread) {
        let ot = {
            autoArchiveDuration: oldThread.autoArchiveDuration,
            id: oldThread.id,
            locked: oldThread.locked,
            name: oldThread.name,
            parentChannel: oldThread.parent.id,
            slowmode: oldThread.rateLimitPerUser,
            type: oldThread.type,
        }
        let nt = {
            autoArchiveDuration: newThread.autoArchiveDuration,
            id: newThread.id,
            locked: newThread.locked,
            name: newThread.name,
            parentChannel: newThread.parent.id,
            slowmode: newThread.rateLimitPerUser,
            type: newThread.type,
        }

        let data = JsonDiff.diff(ot, nt, {full: true});

        addLog(newThread.guild.id, data);

    }
}