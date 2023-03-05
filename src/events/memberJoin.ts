import type { GuildMember } from "discord.js";
import { callback as statsChannelAdd } from "../reflex/statsChannelUpdate.js";
import { callback as welcome } from "../reflex/welcome.js";
import type { NucleusClient } from "../utils/client.js";

export const event = "guildMemberAdd";

export async function callback(client: NucleusClient, member: GuildMember) {
    welcome(client, member);
    statsChannelAdd(client, member);
    const { log, isLogging, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    if (!(await isLogging(member.guild.id, "guildMemberUpdate"))) return;
    await client.database.history.create("join", member.guild.id, member.user, null, null);
    const data = {
        meta: {
            type: "memberJoin",
            displayName: "Member Joined",
            calculateType: "guildMemberUpdate",
            color: NucleusColors.green,
            emoji: "MEMBER" + (member.user.bot ? ".BOT" : "") + ".JOIN",
            timestamp: member.joinedTimestamp ?? Date.now()
        },
        list: {
            memberId: entry(member.id, `\`${member.id}\``),
            name: entry(member.id, renderUser(member.user)),
            joined: entry(member.joinedTimestamp, renderDelta(member.joinedTimestamp?.valueOf()!)),
            accountCreated: entry(member.user.createdTimestamp, renderDelta(member.user.createdTimestamp.valueOf()!)),
            serverMemberCount: member.guild.memberCount
        },
        hidden: {
            guild: member.guild.id
        }
    };
    log(data);
}
