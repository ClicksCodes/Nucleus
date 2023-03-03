import { AuditLogEvent, Guild, GuildAuditLogsEntry, GuildMember } from "discord.js";
import type { NucleusClient } from "../utils/client.js";

import { purgeByUser } from "../actions/tickets/delete.js";
import { callback as statsChannelRemove } from "../reflex/statsChannelUpdate.js";

export const event = "guildMemberRemove";

export async function callback(client: NucleusClient, member: GuildMember) {
    const startTime = Date.now() - 10 * 1000;
    purgeByUser(member.id, member.guild.id);
    await statsChannelRemove(client, member);
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    if (!await isLogging(member.guild.id, "guildMemberUpdate")) return;
    const kickAuditLog = (await getAuditLog(member.guild as Guild, AuditLogEvent.MemberKick))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as GuildMember)!.id === member.id)[0];
    const banAuditLog = (await getAuditLog(member.guild as Guild, AuditLogEvent.MemberBanAdd))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as GuildMember)!.id === member.id)[0];
    let type = "leave";
    if (kickAuditLog) {
        if (kickAuditLog.executor!.id === client.user!.id) return;
        if (kickAuditLog.createdAt.getTime() >= startTime) {
            type = "kick";
        }
    }
    if (banAuditLog) {
        if (banAuditLog.executor!.id === client.user!.id) return;
        if (banAuditLog.createdAt.getTime() >= startTime) {
            if (!kickAuditLog) {
                return
            } else if (kickAuditLog.createdAt.valueOf() < banAuditLog.createdAt.valueOf()) {
                return
            }
        }
    }
    let data;
    if (type === "kick") {
        if (!kickAuditLog) return;
        await client.database.history.create("kick", member.guild.id, member.user, kickAuditLog.executor, kickAuditLog.reason);
        data = {
            meta: {
                type: "memberKick",
                displayName: "Member Kicked",
                calculateType: "guildMemberPunish",
                color: NucleusColors.red,
                emoji: "PUNISH.KICK.RED",
                timestamp: Date.now()
            },
            list: {
                memberId: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedTimestamp, renderDelta(member.joinedTimestamp?.valueOf()!)),
                kicked: entry(Date.now(), renderDelta(Date.now())),
                kickedBy: entry(kickAuditLog.executor!.id, renderUser(kickAuditLog.executor!)),
                reason: entry(kickAuditLog.reason, kickAuditLog.reason ? `\n> ${kickAuditLog.reason}` : "*No reason provided.*"),
                accountCreated: entry(member.user.createdTimestamp, renderDelta(member.user.createdTimestamp)),
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
                timestamp: Date.now()
            },
            list: {
                memberId: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedTimestamp, renderDelta(member.joinedTimestamp?.valueOf()!)),
                left: entry(Date.now(), renderDelta(Date.now())),
                accountCreated: entry(member.user.createdTimestamp, renderDelta(member.user.createdTimestamp)),
                serverMemberCount: member.guild.memberCount
            },
            hidden: {
                guild: member.guild.id
            }
        };
    }
    log(data);
}
