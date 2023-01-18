import { AuditLogEvent, Guild, GuildAuditLogsEntry, GuildChannel, Invite } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";

export const event = "inviteDelete";

export async function callback(client: NucleusClient, invite: Invite) {
    if(!invite.guild) return; // This is a DM invite (not a guild invite
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    const auditLog = (await getAuditLog(invite.guild as Guild, AuditLogEvent.InviteDelete))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as Invite)!.code === invite.code)[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const data = {
        meta: {
            type: "inviteDelete",
            displayName: "Invite Deleted",
            calculateType: "guildUpdate",
            color: NucleusColors.red,
            emoji: "INVITE.DELETE",
            timestamp: new Date().getTime()
        },
        list: {
            channel: entry(invite.channel!.id, renderChannel(invite.channel as GuildChannel)),
            link: entry(invite.url, invite.url),
            expires: entry(invite.maxAge, invite.maxAge ? humanizeDuration(invite.maxAge * 1000) : "Never"),
            deletedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
        },
        hidden: {
            guild: invite.guild!.id
        }
    };
    log(data);
}
