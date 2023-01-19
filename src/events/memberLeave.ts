import { AuditLogEvent, Guild, GuildAuditLogsEntry, GuildMember } from "discord.js";
import type { NucleusClient } from "../utils/client.js";

import { purgeByUser } from "../actions/tickets/delete.js";
import { callback as statsChannelRemove } from "../reflex/statsChannelUpdate.js";

export const event = "guildMemberRemove";

export async function callback(client: NucleusClient, member: GuildMember) {
    purgeByUser(member.id, member.guild.id);
    await statsChannelRemove(client, member);
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    const auditLog = (await getAuditLog(member.guild as Guild, AuditLogEvent.MemberKick))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as GuildMember)!.id === member.id)[0];
    let type = "leave";
    if (auditLog) {
        if (auditLog.executor!.id === client.user!.id) return;
        if (auditLog.createdAt.valueOf() - 100 >= new Date().getTime()) {
            type = "kick";
        }
    }
    let data;
    if (type === "kick") {
        if (!auditLog) return;
        await client.database.history.create("kick", member.guild.id, member.user, auditLog.executor, auditLog.reason);
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
                joined: entry(member.joinedTimestamp, renderDelta(member.joinedTimestamp?.valueOf()!)),
                kicked: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                kickedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
                reason: entry(auditLog.reason, auditLog.reason ? `\n> ${auditLog.reason}` : "*No reason provided.*"),
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
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedTimestamp, renderDelta(member.joinedTimestamp?.valueOf()!)),
                left: entry(new Date().getTime(), renderDelta(new Date().getTime())),
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
