const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'messageReactionRemoveEmoji',
    once:false,
    async execute(messageReaction) {
        let data = {
            name: messageReaction.emoji.name,
            id: messageReaction.emoji.id,
            removedAt: Date.now()
        }

        addLog(messageReaction.message.guild.id, data);
    }
}