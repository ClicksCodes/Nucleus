import type { GuildAuditLogsEntry, GuildBan } from "discord.js";
import { purgeByUser } from "../actions/tickets/delete.js";
import { callback as statsChannelRemove } from "../reflex/statsChannelUpdate.js";
import type { HaikuClient } from "../utils/haiku/index.js";

export const event = "guildBanAdd";

export async function callback(client: HaikuClient, ban: GuildBan) {
    await statsChannelRemove(client, undefined, ban.guild, ban.user);
    purgeByUser(ban.user.id, ban.guild);
    const { log, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = client.logger;
    const auditLog = await getAuditLog(ban.guild, "MEMBER_BAN_ADD");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === ban.user.id).first();
    if (audit.executor.id === client.user.id) return;
    await client.database.history.create("ban", ban.guild.id, ban.user, audit.executor, audit.reason);
    const data = {
        meta: {
            type: "memberBan",
            displayName: "Member Banned",
            calculateType: "guildMemberPunish",
            color: NucleusColors.red,
            emoji: "PUNISH.BAN.RED",
            timestamp: new Date().getTime()
        },
        list: {
            memberId: entry(ban.user.id, `\`${ban.user.id}\``),
            name: entry(ban.user.id, renderUser(ban.user)),
            banned: entry(new Date().getTime(), renderDelta(new Date().getTime())),
            bannedBy: entry(audit.executor.id, renderUser(audit.executor)),
            reason: entry(audit.reason, audit.reason ? `\n> ${audit.reason}` : "*No reason provided.*"),
            accountCreated: entry(ban.user.createdAt, renderDelta(ban.user.createdAt)),
            serverMemberCount: ban.guild.memberCount
        },
        hidden: {
            guild: ban.guild.id
        }
    };
    log(data);
}
