const {addLog} = require('../scripts/addLogs');
module.exports = {
    name:'stickerCreate',
    once:false,
    async execute(sticker) {
        let data = {
            id: sticker.id,
            createdAt: sticker.createdTimestamp,
            description: sticker.description,
            name: sticker.name,
            type: sticker.type,
            tags: sticker.tags,
            createdBy: sticker.user.id
        }

        addLog(role.guild.id, data);
    }
}