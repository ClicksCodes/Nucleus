import convertCurlyBracketString from "../utils/convertCurlyBracketString.js";
import singleNotify from "../utils/singleNotify.js";
import client from "../utils/client.js";

interface PropSchema {
    enabled: boolean;
    name: string;
}

export async function callback(_, member) {
    const guild = await client.guilds.fetch(member.guild.id);
    const config = await client.database.guilds.read(guild.id);
    Object.entries(config.getKey("stats")).forEach(async ([channel, props]) => {
        if ((props as PropSchema).enabled) {
            let string = (props as PropSchema).name;
            if (!string) return;
            string = await convertCurlyBracketString(
                string,
                member.id,
                member.displayName,
                guild.name,
                guild.members
            );
            let fetchedChannel;
            try {
                fetchedChannel = await guild.channels.fetch(channel);
            } catch (e) {
                fetchedChannel = null;
            }
            if (!fetchedChannel) {
                const deleted = config.getKey("stats")[channel];
                console.log(`stats.${channel}`);
                console.log(guild.id);
                await client.database.guilds.write(
                    guild.id,
                    null,
                    `stats.${channel}`
                );
                return singleNotify(
                    "statsChannelDeleted",
                    guild.id,
                    "One or more of your stats channels have been deleted. Please use `/settings stats` if you wish to add the channel again.\n" +
                        `The channels name was: ${deleted.name}`,
                    "Critical"
                );
            }
            try {
                await fetchedChannel.setName(string.slice(0, 100));
            } catch (e) {
                console.error(e);
            }
        }
    });
}
