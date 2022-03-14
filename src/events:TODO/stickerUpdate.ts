const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');
module.exports = {
    name:'stickerUpdate',
    once:false,
    async execute(oldSticker, newSticker) {
        let os = {
            id: sticker.id,
            description: sticker.description,
            name: sticker.name,
            type: sticker.type,
            tags: sticker.tags,
        }

        let ns = {
            id: sticker.id,
            description: sticker.description,
            name: sticker.name,
            type: sticker.type,
            tags: sticker.tags,
        }

        let data = JsonDiff.diff(os, ns, {full: true});

        addLog(role.guild.id, data);
    }
}