import type { Guild, User } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import type { GuildMember } from "discord.js";
import convertCurlyBracketString from "../utils/convertCurlyBracketString.js";
import singleNotify from "../utils/singleNotify.js";

interface PropSchema {
    enabled: boolean;
    name: string;
}

export async function callback(client: NucleusClient, member?: GuildMember, guild?: Guild, user?: User) {
    if (!member && !guild) return;
    guild = await client.guilds.fetch(member ? member.guild.id : guild!.id);
    if (!guild) return;
    user = user ?? member!.user;
    const config = await client.database.guilds.read(guild.id);
    Object.entries(config.getKey("stats")).forEach(async ([channel, props]) => {
        if ((props as PropSchema).enabled) {
            let string = (props as PropSchema).name;
            if (!string) return;
            string = await convertCurlyBracketString(string, user!.id, user!.username, guild!.name, guild!.members);
            let fetchedChannel;
            try {
                fetchedChannel = await guild!.channels.fetch(channel);
            } catch (e) {
                fetchedChannel = null;
            }
            if (!fetchedChannel) {
                const deleted = config.getKey("stats")[channel];
                await client.database.guilds.write(guild!.id, null, `stats.${channel}`);
                return singleNotify(
                    "statsChannelDeleted",
                    guild!.id,
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
