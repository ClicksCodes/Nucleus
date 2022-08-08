export const event = "guildMemberUpdate";

export async function callback(client, before, after) {
    try {
        const { log, NucleusColors, entry, renderUser, renderDelta, getAuditLog } = after.client.logger;
        const auditLog = await getAuditLog(after.guild, "MEMBER_UPDATE");
        const audit = auditLog.entries.filter((entry) => entry.target.id === after.id).first();
        if (audit.executor.id === client.user.id) return;
        if (before.nickname !== after.nickname) {
            await client.database.history.create(
                "nickname",
                after.guild.id,
                after.user,
                audit.executor,
                null,
                before.nickname || before.user.username,
                after.nickname || after.user.username
            );
            const data = {
                meta: {
                    type: "memberUpdate",
                    displayName: "Nickname Changed",
                    calculateType: "guildMemberUpdate",
                    color: NucleusColors.yellow,
                    emoji: "PUNISH.NICKNAME.YELLOW",
                    timestamp: new Date().getTime()
                },
                list: {
                    memberId: entry(after.id, `\`${after.id}\``),
                    name: entry(after.user.id, renderUser(after.user)),
                    before: entry(before.nickname, before.nickname ? before.nickname : "*None*"),
                    after: entry(after.nickname, after.nickname ? after.nickname : "*None*"),
                    changed: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    changedBy: entry(audit.executor.id, renderUser(audit.executor))
                },
                hidden: {
                    guild: after.guild.id
                }
            };
            log(data);
        } else if (
            before.communicationDisabledUntilTimestamp < new Date().getTime() &&
            after.communicationDisabledUntil > new Date().getTime()
        ) {
            await client.database.history.create(
                "mute",
                after.guild.id,
                after.user,
                audit.executor,
                audit.reason,
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
                    timestamp: new Date().getTime()
                },
                list: {
                    memberId: entry(after.id, `\`${after.id}\``),
                    name: entry(after.user.id, renderUser(after.user)),
                    mutedUntil: entry(
                        after.communicationDisabledUntilTimestamp,
                        renderDelta(after.communicationDisabledUntilTimestamp)
                    ),
                    muted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    mutedBy: entry(audit.executor.id, renderUser(audit.executor)),
                    reason: entry(audit.reason, audit.reason ? audit.reason : "\n> *No reason provided*")
                },
                hidden: {
                    guild: after.guild.id
                }
            };
            log(data);
            client.database.eventScheduler.schedule("naturalUnmute", after.communicationDisabledUntil, {
                guild: after.guild.id,
                user: after.id,
                expires: after.communicationDisabledUntilTimestamp
            });
        } else if (
            after.communicationDisabledUntil === null &&
            before.communicationDisabledUntilTimestamp !== null &&
            new Date().getTime() >= audit.createdTimestamp
        ) {
            await client.database.history.create(
                "unmute",
                after.guild.id,
                after.user,
                audit.executor,
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
                    timestamp: new Date().getTime()
                },
                list: {
                    memberId: entry(after.id, `\`${after.id}\``),
                    name: entry(after.user.id, renderUser(after.user)),
                    unmuted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    unmutedBy: entry(audit.executor.id, renderUser(audit.executor))
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
    } catch (e) {
        console.log(e);
    }
}
