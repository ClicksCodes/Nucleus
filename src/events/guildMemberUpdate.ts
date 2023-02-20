import { AuditLogEvent, GuildAuditLogsEntry, GuildMember } from "discord.js";
import type { NucleusClient } from "../utils/client.js";

export const event = "guildMemberUpdate";

export async function callback(client: NucleusClient, before: GuildMember, after: GuildMember) {
    const { log, isLogging, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = client.logger;
    if (!await isLogging(after.guild.id, "memberUpdate")) return;
    const auditLog = (await getAuditLog(after.guild, AuditLogEvent.EmojiCreate))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as GuildMember)!.id === after.id)[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;
    if (before.nickname !== after.nickname) {
        await client.database.history.create(
            "nickname",
            after.guild.id,
            after.user,
            auditLog.executor,
            null,
            before.nickname ?? before.user.username,
            after.nickname ?? after.user.username
        );
        const data = {
            meta: {
                type: "memberUpdate",
                displayName: "Nickname Changed",
                calculateType: "guildMemberUpdate",
                color: NucleusColors.yellow,
                emoji: "PUNISH.NICKNAME.YELLOW",
                timestamp: Date.now()
            },
            list: {
                memberId: entry(after.id, `\`${after.id}\``),
                name: entry(after.user.id, renderUser(after.user)),
                before: entry(before.nickname, before.nickname ? before.nickname : "*None*"),
                after: entry(after.nickname, after.nickname ? after.nickname : "*None*"),
                changed: entry(Date.now(), renderDelta(Date.now())),
                changedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!))
            },
            hidden: {
                guild: after.guild.id
            }
        };
        log(data);
    } else if (
        (before.communicationDisabledUntilTimestamp ?? 0) < Date.now() &&
        (after.communicationDisabledUntil ?? 0) > Date.now()
    ) {
        await client.database.history.create(
            "mute",
            after.guild.id,
            after.user,
            auditLog.executor,
            auditLog.reason,
            null,
            null,
            null
        );
        const data = {
            meta: {
                type: "memberMute",
                displayName: "Muted",
                calculateType: "guildMemberPunish",
                color: NucleusColors.yellow,
                emoji: "PUNISH.MUTE.YELLOW",
                timestamp: Date.now()
            },
            list: {
                memberId: entry(after.id, `\`${after.id}\``),
                name: entry(after.user.id, renderUser(after.user)),
                mutedUntil: entry(
                    after.communicationDisabledUntilTimestamp,
                    renderDelta(after.communicationDisabledUntilTimestamp!)
                ),
                muted: entry(Date.now(), renderDelta(Date.now())),
                mutedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
                reason: entry(auditLog.reason, auditLog.reason ? auditLog.reason : "\n> *No reason provided*")
            },
            hidden: {
                guild: after.guild.id
            }
        };
        log(data);
        client.database.eventScheduler.schedule("naturalUnmute", after.communicationDisabledUntil?.toISOString()!, {
            guild: after.guild.id,
            user: after.id,
            expires: after.communicationDisabledUntilTimestamp
        });
    } else if (
        after.communicationDisabledUntil === null &&
        before.communicationDisabledUntilTimestamp !== null &&
        Date.now() >= auditLog.createdTimestamp
    ) {
        await client.database.history.create(
            "unmute",
            after.guild.id,
            after.user,
            auditLog.executor,
            null,
            null,
            null,
            null
        );
        const data = {
            meta: {
                type: "memberUnmute",
                displayName: "Unmuted",
                calculateType: "guildMemberPunish",
                color: NucleusColors.green,
                emoji: "PUNISH.MUTE.GREEN",
                timestamp: Date.now()
            },
            list: {
                memberId: entry(after.id, `\`${after.id}\``),
                name: entry(after.user.id, renderUser(after.user)),
                unmuted: entry(Date.now(), renderDelta(Date.now())),
                unmutedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!))
            },
            hidden: {
                guild: after.guild.id
            }
        };
        log(data);
        client.database.eventScheduler.cancel("naturalUnmute", {
            guild: after.guild.id,
            user: after.id,
            expires: before.communicationDisabledUntilTimestamp
        });
    }
}
