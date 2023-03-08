import type { GuildAuditLogsEntry, GuildBan, User } from "discord.js";
import { AuditLogEvent } from "discord.js";
import type { NucleusClient } from "../utils/client.js";

export const event = "guildBanRemove";

export async function callback(client: NucleusClient, ban: GuildBan) {
    const { log, isLogging, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = client.logger;
    if (!(await isLogging(ban.guild.id, "guildMemberPunish"))) return;
    const auditLog = (await getAuditLog(ban.guild, AuditLogEvent.MemberBanRemove)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target! as User).id === ban.user.id
    )[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;
    await client.database.history.create("unban", ban.guild.id, ban.user, auditLog.executor, auditLog.reason);
    const data = {
        meta: {
            type: "memberUnban",
            displayName: "Member Unbanned",
            calculateType: "guildMemberPunish",
            color: NucleusColors.green,
            emoji: "PUNISH.BAN.GREEN",
            timestamp: Date.now()
        },
        list: {
            memberId: entry(ban.user.id, `\`${ban.user.id}\``),
            name: entry(ban.user.id, renderUser(ban.user)),
            unbanned: entry(Date.now(), renderDelta(Date.now())),
            unbannedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            accountCreated: entry(ban.user.createdTimestamp, renderDelta(ban.user.createdTimestamp))
        },
        hidden: {
            guild: ban.guild.id
        }
    };
    await log(data);
}
