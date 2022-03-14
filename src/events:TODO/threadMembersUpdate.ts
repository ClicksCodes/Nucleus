const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');
module.exports = {
    name:'threadMembersUpdate',
    once:false,
    async execute(oldMembers, newMembers) {
        
        let om = oldMembers.map(m => m.id);
        let nm = newMembers.map(m => m.id);
        let data = JsonDiff.diff(om, nm);

        addLog(newMembers.first().guild.id, data);

    }
}