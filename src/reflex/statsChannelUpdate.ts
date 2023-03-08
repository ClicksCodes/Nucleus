import { getCommandMentionByName } from "../utils/getCommandDataByName.js";
import type { Guild, User } from "discord.js";
import client from "../utils/client.js";
import convertCurlyBracketString from "../utils/convertCurlyBracketString.js";
import singleNotify from "../utils/singleNotify.js";

interface PropSchema {
    enabled: boolean;
    name: string;
}

export async function callback(user: User, guild: Guild) {
    guild = await client.guilds.fetch(guild.id);
    const config = await client.database.guilds.read(guild.id);
    Object.entries(config.stats).forEach(
        ([channel, props]) =>
            void (async () => {
                if ((props as PropSchema).enabled) {
                    let string = (props as PropSchema).name;
                    if (!string) return;
                    string = await convertCurlyBracketString(
                        string,
                        user!.id,
                        user!.username,
                        guild!.name,
                        guild!.members
                    );
                    let fetchedChannel;
                    try {
                        fetchedChannel = await guild.channels.fetch(channel);
                    } catch (e) {
                        fetchedChannel = null;
                    }
                    if (!fetchedChannel) {
                        const deleted = config.stats[channel];
                        await client.database.guilds.write(guild.id, null, `stats.${channel}`);
                        return singleNotify(
                            "statsChannelDeleted",
                            guild.id,
                            `One or more of your stats channels have been deleted. You can use ${getCommandMentionByName(
                                "settings/stats"
                            )}.\n` + `The channels name was: ${deleted!.name}`,
                            "Critical"
                        );
                    }
                    try {
                        await fetchedChannel.setName(string.slice(0, 100));
                    } catch (e) {
                        console.error(e);
                    }
                }
            })()
    );
}
