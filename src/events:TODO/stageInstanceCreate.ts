const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'stageInstanceCreate',
    once:false,
    async execute(stageInstance) {
        let data = {
            id: stageInstance.id,
            channel: stageInstance.channel.id,
            channelName: stageInstance.channel.name,
            createdAt: stageInstance.createdTimestamp,
            topic: stageInstance.topic,
            discoverable: !stageInstance.discoverableDisabled,
            privacy: stageInstance.privacyLevel
        }

        addLog(role.guild.id, data);

    }
}