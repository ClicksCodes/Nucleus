const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'stageInstanceDelete',
    once:false,
    async execute(stageInstance) {

        let logs = await stageInstance.guild.fetchAuditLogs({type: 'STAGE_INSTANCE_DELETE'});
        let entry = logs.entries.find(e => e.target.id === stageInstance.id);

        let data = {
            id: stageInstance.id,
            channel: stageInstance.channel.id,
            channelName: stageInstance.channel.name,
            deletedAt: entry.createdTimestamp,
            deletedBy: entry.deletedBy,
            topic: stageInstance.topic,
            discoverable: !stageInstance.discoverableDisabled,
            privacy: stageInstance.privacyLevel
        }

        addLog(role.guild.id, data);

    }
}