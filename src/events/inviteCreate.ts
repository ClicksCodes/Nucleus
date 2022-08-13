import type { GuildAuditLogsEntry, Invite } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
// @ts-expect-error
import type { HaikuClient } from "jshaiku";

export const event = "inviteCreate";

export async function callback(client: HaikuClient, invite: Invite) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    const auditLog = await getAuditLog(invite.guild, "INVITE_CREATE");
    const audit = auditLog.entries
        .filter((entry: GuildAuditLogsEntry) => entry.target!.id === invite.inviterId)
        .first();
    if (audit.executor.id === client.user.id) return;
    const data = {
        meta: {
            type: "inviteCreate",
            displayName: "Invite Created",
            calculateType: "guildUpdate",
            color: NucleusColors.green,
            emoji: "INVITE.CREATE",
            timestamp: invite.createdTimestamp
        },
        list: {
            channel: entry(invite.channel.id, renderChannel(invite.channel)),
            link: entry(invite.url, invite.url),
            expires: entry(invite.maxAge, invite.maxAge ? humanizeDuration(invite.maxAge * 1000) : "Never"),
            createdBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(invite.createdTimestamp, renderDelta(invite.createdTimestamp))
        },
        hidden: {
            guild: invite.guild!.id
        }
    };
    log(data);
}
