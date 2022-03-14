const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'messageCreate',
    once:false,
    async execute(message) {

        const guildConfig = require(`../data/guilds/${message.guild.id}/config.json`);
        if(guildConfig.images.enabled) {

        }
        if(guildConfig.wordFilter.enabled) {
            for(word of guildConfig.wordFilter.words.strict) {
                if(message.content.toLowerCase().includes(word)) {
                    message.delete();
                    // message.channel.send(`${message.author} has been warned for using a banned word.`);
                    break;
                }
            }
            for(word of message.content.split(' ')) {
                if(guildConfig.wordFilter.words.soft.includes(word)) {
                    message.delete();
                    // message.channel.send(`${message.author} has been warned for using a banned word.`);
                    break;
                }
            }
            
        }


    }
}