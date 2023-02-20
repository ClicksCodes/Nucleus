import { AuditLogEvent, Guild, GuildAuditLogsEntry, GuildChannel, Invite } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";

export const event = "inviteCreate";

export async function callback(client: NucleusClient, invite: Invite) {
    if(!invite.guild) return; // This is a DM invite (not a guild invite
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    if (!await isLogging(invite.guild.id, "guildUpdate")) return;
    const auditLog = (await getAuditLog(invite.guild as Guild, AuditLogEvent.InviteCreate))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as Invite)!.code === invite.code)[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const data = {
        meta: {
            type: "inviteCreate",
            displayName: "Invite Created",
            calculateType: "guildUpdate",
            color: NucleusColors.green,
            emoji: "INVITE.CREATE",
            timestamp: invite.createdTimestamp ?? Date.now()
        },
        list: {
            channel: entry(invite.channel!.id, renderChannel(invite.channel as GuildChannel)),
            link: entry(invite.url, invite.url),
            expires: entry(invite.maxAge, invite.maxAge ? humanizeDuration(invite.maxAge * 1000) : "Never"),
            createdBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(invite.createdTimestamp, renderDelta(invite.createdTimestamp!))
        },
        hidden: {
            guild: invite.guild!.id
        }
    };
    log(data);
}
