import { AuditLogEvent, GuildAuditLogsEntry, GuildMember } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import type { LoggerOptions } from "../utils/log.js";
import { generalException } from "../utils/createTemporaryStorage.js";
import { doMemberChecks } from "../reflex/scanners.js";

export const event = "guildMemberUpdate";

export async function callback(client: NucleusClient, before: GuildMember, after: GuildMember) {
    const { log, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = client.logger;
    if (before.guild.id === "684492926528651336") {
        await client.database.premium.checkAllPremium(after);
    }

    if (!before.roles.cache.equals(after.roles.cache)) {
        const auditLog = (await getAuditLog(after.guild, AuditLogEvent.MemberRoleUpdate)).filter(
            (entry: GuildAuditLogsEntry) => (entry.target as GuildMember)!.id === after.id
        )[0];
        if (!auditLog) return;
        if (client.noLog.includes(`${after.guild.id}${after.id}${auditLog.id}`)) return;
        generalException(`${after.guild.id}${after.id}${auditLog.id}`);
        if (auditLog.executor!.id !== client.user!.id) {
            const rolesAdded = after.roles.cache.filter((role) => !before.roles.cache.has(role.id));
            const rolesRemoved = before.roles.cache.filter((role) => !after.roles.cache.has(role.id));
            let displayName = "Roles Removed";
            let color = NucleusColors.red;
            let emoji = "GUILD.ROLES.DELETE";
            if (rolesAdded.size > 0 && rolesRemoved.size > 0) {
                displayName = "Roles Changed";
                color = NucleusColors.yellow;
                emoji = "GUILD.ROLES.EDIT";
            } else if (rolesAdded.size > 0) {
                displayName = "Roles Added";
                color = NucleusColors.green;
                emoji = "GUILD.ROLES.CREATE";
            }
            const removedEntry = rolesRemoved.map((role) => role.id);
            const addedEntry = rolesAdded.map((role) => role.id);

            let list = {
                memberId: entry(after.id, `\`${after.id}\``),
                name: entry(after.user.id, renderUser(after.user))
            };

            if (rolesAdded.size > 0) {
                list = Object.assign(list, {
                    rolesAdded: entry(addedEntry, addedEntry.map((id) => `<@&${id}>`).join(", "))
                });
            }
            if (rolesRemoved.size > 0) {
                list = Object.assign(list, {
                    rolesRemoved: entry(removedEntry, removedEntry.map((id) => `<@&${id}>`).join(", "))
                });
            }

            list = Object.assign(list, {
                changed: entry(Date.now(), renderDelta(Date.now())),
                changedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!))
            });

            let data: LoggerOptions = {
                meta: {
                    type: "memberUpdate",
                    displayName: displayName,
                    calculateType: "guildMemberUpdate",
                    color: color,
                    emoji: emoji,
                    timestamp: Date.now()
                },
                list: {},
                hidden: {
                    guild: after.guild.id
                }
            };

            if (rolesAdded.size > 0) {
                list = Object.assign(list, {
                    rolesAdded: entry(addedEntry, addedEntry.map((id) => `<@&${id}>`).join(", "))
                });
            }
            if (rolesRemoved.size > 0) {
                list = Object.assign(list, {
                    rolesRemoved: entry(removedEntry, removedEntry.map((id) => `<@&${id}>`).join(", "))
                });
            }
            data = Object.assign(data, { list: list });
            await log(data);
        }
    }
    if (before.displayAvatarURL !== after.displayAvatarURL) await doMemberChecks(after);
    const auditLog = (await getAuditLog(after.guild, AuditLogEvent.MemberUpdate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as GuildMember)!.id === after.id
    )[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;
    if (before.nickname !== after.nickname) {
        await doMemberChecks(after);
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
        await log(data);
    }
    if (
        (before.communicationDisabledUntilTimestamp ?? 0) < Date.now() &&
        new Date(after.communicationDisabledUntil ?? 0).getTime() > Date.now()
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
        await log(data);
        await client.database.eventScheduler.schedule(
            "naturalUnmute",
            after.communicationDisabledUntil?.toISOString()!,
            {
                guild: after.guild.id,
                user: after.id,
                expires: after.communicationDisabledUntilTimestamp
            }
        );
    }
    if (
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
        await log(data);
        await client.database.eventScheduler.cancel("naturalUnmute", {
            guild: after.guild.id,
            user: after.id,
            expires: before.communicationDisabledUntilTimestamp
        });
    }
}
