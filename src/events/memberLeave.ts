import type { GuildAuditLogsEntry, GuildMember } from "discord.js";
// @ts-expect-error
import type { HaikuClient } from "jshaiku";

import { purgeByUser } from "../actions/tickets/delete.js";
import { callback as statsChannelRemove } from "../reflex/statsChannelUpdate.js";

export const event = "guildMemberRemove";

export async function callback(client: HaikuClient, member: GuildMember) {
    purgeByUser(member.id, member.guild);
    await statsChannelRemove(client, member);
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    const auditLog = await getAuditLog(member.guild, "MEMBER_KICK");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === member.id).first();
    let type = "leave";
    if (audit) {
        if (audit.executor.id === client.user.id) return;
        if (audit.createdAt - 100 >= new Date().getTime()) {
            type = "kick";
        }
    }
    let data;
    if (type === "kick") {
        await client.database.history.create("kick", member.guild.id, member.user, audit.executor, audit.reason);
        data = {
            meta: {
                type: "memberKick",
                displayName: "Member Kicked",
                calculateType: "guildMemberPunish",
                color: NucleusColors.red,
                emoji: "PUNISH.KICK.RED",
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedAt, renderDelta(member.joinedAt)),
                kicked: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                kickedBy: entry(audit.executor.id, renderUser(audit.executor)),
                reason: entry(audit.reason, audit.reason ? `\n> ${audit.reason}` : "*No reason provided.*"),
                accountCreated: entry(member.user.createdAt, renderDelta(member.user.createdAt)),
                serverMemberCount: member.guild.memberCount
            },
            hidden: {
                guild: member.guild.id
            }
        };
    } else {
        await client.database.history.create("leave", member.guild.id, member.user, null, null);
        data = {
            meta: {
                type: "memberLeave",
                displayName: "Member Left",
                calculateType: "guildMemberUpdate",
                color: NucleusColors.red,
                emoji: "MEMBER." + (member.user.bot ? "BOT." : "") + "LEAVE",
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedTimestamp, renderDelta(member.joinedAt)),
                left: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                accountCreated: entry(member.user.createdAt, renderDelta(member.user.createdAt)),
                serverMemberCount: member.guild.memberCount
            },
            hidden: {
                guild: member.guild.id
            }
        };
    }
    log(data);
}
