const {addLog} = require('../scripts/addLogs');
module.exports = {
    name:'stickerDelete',
    once:false,
    async execute(sticker) {

        let logs = await sticker.guild.fetchAuditLogs({type: 'STICKER_DELETE'});
        let entry = logs.entries.find(e => e.target.id === sticker.id);

        let data = {
            id: sticker.id,
            deletedAt: entry.createdTimestamp,
            description: sticker.description,
            name: sticker.name,
            type: sticker.type,
            tags: sticker.tags,
            deletedBy: entry.executor.id
        }

        addLog(role.guild.id, data);

    }
}