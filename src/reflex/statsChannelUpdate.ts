import convertCurlyBracketString from '../utils/convertCurlyBracketString.js'
import singleNotify from '../utils/singleNotify.js';
import client from '../utils/client.js';

interface PropSchema { enabled: boolean, name: string }

export async function callback(_, member) {
    let guild = await client.guilds.fetch(member.guild.id)
    let config = await client.database.guilds.read(guild.id);
    Object.entries(config.getKey("stats")).forEach(async ([channel, props]) => {
        if ((props as PropSchema).enabled) {
            let string = (props as PropSchema).name
            if (!string) return
            string = await convertCurlyBracketString(string, member.id, member.displayName, guild.name, guild.members)
            let fetchedChannel;
            try {
                fetchedChannel = await guild.channels.fetch(channel)
            } catch (e) { fetchedChannel = null }
            if (!fetchedChannel) {
                return singleNotify(
                    "statsChannelDeleted",
                    guild.id,
                    "One or more of your stats channels have been deleted. Please open the settings menu to change this.",
                    "Critical"
                )
            }
            try {
                await fetchedChannel.setName(string)
            } catch (e) {
                console.error(e)
            }
        }
    });
}
