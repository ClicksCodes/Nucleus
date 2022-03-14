const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'messageReactionAdd',
    once:false,
    async execute(messageReaction, user) {
        let data = {
            messageReaction: {
                messageID: messageReaction.message.id,
                reactionEmoji: {
                    name: messageReaction.emoji.name,
                    id: messageReaction.emoji.id
                },
                addedAt: Date.now()
            },
            user: {
                id: user.id,
                username: user.username
            }
        }

        addLog(messageReaction.message.guild.id, data);
    }
}