import type { GuildAuditLogsEntry, GuildBan, User } from "discord.js";
import { AuditLogEvent } from "discord.js";
import { purgeByUser } from "../actions/tickets/delete.js";
import { callback as statsChannelRemove } from "../reflex/statsChannelUpdate.js";
import type { NucleusClient } from "../utils/client.js";

export const event = "guildBanAdd";

export async function callback(client: NucleusClient, ban: GuildBan) {
    const { log, isLogging, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = client.logger;
    await statsChannelRemove(ban.user, ban.guild);
    await purgeByUser(ban.user.id, ban.guild.id);
    if (!(await isLogging(ban.guild.id, "guildMemberPunish"))) return;
    const auditLog: GuildAuditLogsEntry | undefined = (await getAuditLog(ban.guild, AuditLogEvent.MemberBanAdd)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target! as User).id === ban.user.id
    )[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;
    await client.database.history.create("ban", ban.guild.id, ban.user, auditLog.executor, auditLog.reason);
    const data = {
        meta: {
            type: "memberBan",
            displayName: "Member Banned",
            calculateType: "guildMemberPunish",
            color: NucleusColors.red,
            emoji: "PUNISH.BAN.RED",
            timestamp: Date.now()
        },
        list: {
            memberId: entry(ban.user.id, `\`${ban.user.id}\``),
            name: entry(ban.user.id, renderUser(ban.user)),
            banned: entry(Date.now(), renderDelta(Date.now())),
            bannedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            reason: entry(auditLog.reason, auditLog.reason ? `\n> ${auditLog.reason}` : "*No reason provided.*"),
            accountCreated: entry(ban.user.createdTimestamp, renderDelta(ban.user.createdTimestamp)),
            serverMemberCount: ban.guild.memberCount
        },
        hidden: {
            guild: ban.guild.id
        }
    };
    await log(data);
}
