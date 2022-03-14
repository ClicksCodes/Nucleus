const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');

module.exports = {
    name:'guildMemberUpdate',
    once:false,
    async execute(oldMember, newMember) {

        let oMem = {
            id: oldMember.id,
            username: oldMember.user.username,
            nick: oldMember.nickname,
            roles: oldMember.roles.cache.map(r => r.id),
            displayAvatarUrl: oldMember.displayAvatarUrl,
            communicationDisabledUntil: oldMember.communicationDisabledUntilTimestamp
        }

        let nMem = {
            id: newMember.id,
            username: newMember.user.username,
            nick: newMember.nickname,
            roles: newMember.roles.cache.map(r => r.id),
            displayAvatarUrl: newMember.displayAvatarUrl,
            communicationDisabledUntil: newMember.communicationDisabledUntilTimestamp
        }

        let data = JsonDiff.diff(oMem, nMem, {full: true});

        addLog(newMember.guild.id, data);
    }
}