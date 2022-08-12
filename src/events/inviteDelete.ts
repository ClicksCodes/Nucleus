import type { GuildAuditLogsEntry, Invite } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
// @ts-expect-error
import type { HaikuClient } from "jshaiku";

export const event = "inviteDelete";

export async function callback(client: HaikuClient, invite: Invite) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    const auditLog = await getAuditLog(invite.guild, "INVITE_DELETE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === invite.inviterId).first();
    if (audit.executor.id === client.user.id) return;
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
            channel: entry(invite.channel.id, renderChannel(invite.channel)),
            link: entry(invite.url, invite.url),
            expires: entry(invite.maxAge, invite.maxAge ? humanizeDuration(invite.maxAge * 1000) : "Never"),
            deletedBy: entry(audit.executor.id, renderUser(audit.executor)),
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
        },
        hidden: {
            guild: invite.guild!.id
        }
    };
    log(data);
}
