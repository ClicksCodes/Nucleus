import type { GuildAuditLogsEntry, GuildBan } from 'discord.js';
import { purgeByUser } from "../actions/tickets/delete.js";
// @ts-expect-error
import type { HaikuClient } from "jshaiku";

export const event = "guildBanRemove";

export async function callback(client: HaikuClient, ban: GuildBan) {
    purgeByUser(ban.user.id, ban.guild);
    const { log, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = client.logger;
    const auditLog = await getAuditLog(ban.guild, "MEMBER_BAN_REMOVE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === ban.user.id).first();
    if (audit.executor.id === client.user.id) return;
    await client.database.history.create("unban", ban.guild.id, ban.user, audit.executor, audit.reason);
    const data = {
        meta: {
            type: "memberUnban",
            displayName: "Member Unbanned",
            calculateType: "guildMemberPunish",
            color: NucleusColors.green,
            emoji: "PUNISH.BAN.GREEN",
            timestamp: new Date().getTime()
        },
        list: {
            memberId: entry(ban.user.id, `\`${ban.user.id}\``),
            name: entry(ban.user.id, renderUser(ban.user)),
            unbanned: entry(new Date().getTime(), renderDelta(new Date().getTime())),
            unbannedBy: entry(audit.executor.id, renderUser(audit.executor)),
            accountCreated: entry(ban.user.createdAt, renderDelta(ban.user.createdAt))
        },
        hidden: {
            guild: ban.guild.id
        }
    };
    log(data);
}