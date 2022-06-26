import client from '../utils/client.js';
import convertCurlyBracketString from '../utils/convertCurlyBracketString.js'
import singleNotify from '../utils/singleNotify.js';

export async function callback(_, member) {
    let config = await client.database.guilds.read(member.guild.id);

    config.stats.forEach(async element => {
        if (element.enabled) {
            let string = element.text
            if (!string) return
            string = await convertCurlyBracketString(string, member.id, member.displayName, member.guild.name, member.guild.members)

            let channel = await member.client.channels.fetch(element.channel)
            if (channel.guild.id !== member.guild.id) return
            if (!channel) return singleNotify(
                "statsChannelDeleted",
                member.guild.id,
                "One or more of your stats channels have been deleted. Please open the settings menu to change this.",
                "Critical"
            )
            try {
                await channel.edit({ name: string })
            } catch (err) {
                console.error(err)
            }
        }
    });
}