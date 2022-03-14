const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'messageReactionRemoveAll',
    once:false,
    async execute(message, reactions) {
        let data = {
            messageID: message.id,
            reactions: reactions.map(r => {
                return {
                    name: r.emoji.name,
                    id: r.emoji.id
                }
            }),
            removedAt: Date.now()
        }

        addLog(message.guild.id, data);
    }
}