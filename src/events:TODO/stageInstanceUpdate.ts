const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');

module.exports = {
    name:'stageInstanceUpdate',
    once:false,
    async execute(oldStage, newStage) {
        let os = {
            id: oldStage.id,
            channel: oldStage.channel.id,
            channelName: oldStage.channel.name,
            topic: oldStage.topic,
            discoverable: !oldStage.discoverableDisabled,
            privacy: oldStage.privacyLevel
        }

        let ns = {
            id: newStage.id,
            channel: newStage.channel.id,
            channelName: newStage.channel.name,
            topic: newStage.topic,
            discoverable: !newStage.discoverableDisabled,
            privacy: newStage.privacyLevel
        }

        let data = JsonDiff.diff(os, ns, {full: true});

        addLog(role.guild.id, data);
    }
}