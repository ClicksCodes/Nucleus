import log from '../utils/log.js'
import readConfig from '../utils/readConfig.js'
import convertCurlyBracketString from '../utils/convertCurlyBracketString.js'

export async function callback(_, member) {
    let config = await readConfig(member.guild.id);

    config.stats.forEach(async element => {
        if (element.enabled) {
            let string = element.text
            if (!string) return
            string = await convertCurlyBracketString(string, member.id, member.displayName, member.guild.name, member.guild.members)

            let channel = await member.client.channels.fetch(element.channel)
            if (channel.guild.id !== member.guild.id) return
            if (!channel) return // TODO: Notify mods
            try {
                await channel.edit({ name: string })
            } catch (err) {
                console.error(err)
            }
        }
    });
}