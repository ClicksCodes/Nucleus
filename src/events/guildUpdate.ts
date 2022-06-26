export const event = 'guildUpdate'

export async function callback(client, before, after) {
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = after.client.logger
        let auditLog = await getAuditLog(after, 'GUILD_UPDATE');
        let audit = auditLog.entries.filter(entry => entry.target.id == after.id).first();
        if (audit.executor.id == client.user.id) return;
        let list = {}

        const verificationLevels = {
            NONE: 'Unrestricted',
            LOW: 'Verified email',
            MEDIUM: 'Registered (5 minutes)',
            HIGH: 'Member (10 minutes)',
            VERY_HIGH: 'Verified phone'
        }

        const explicitContentFilterLevels = {
            DISABLED: 'Disabled',
            MEMBERS_WITHOUT_ROLES: 'Members without roles',
            ALL_MEMBERS: 'All members'
        }

        const MFALevels = {
            NONE: 'None',
            ELEVATED: 'Enabled'
        }

        if (before.name != after.name) list["name"] = entry([before.name, after.name], `${before.name} -> ${after.name}`);
        if (before.icon != after.icon) list["icon"] = entry([before.icon, after.icon], `[Before](${before.iconURL()}) -> [After](${after.iconURL()})`);
        if (before.splash != after.splash) list["splash"] = entry([before.splash, after.splash], `[Before](${before.splashURL()}) -> [After](${after.splashURL()})`);
        if (before.banner != after.banner) list["banner"] = entry([before.banner, after.banner], `[Before](${before.bannerURL()}) -> [After](${after.bannerURL()})`);
        if (before.owner != after.owner) list["owner"] = entry([before.owner, after.owner], `${renderUser(before.owner.user)} -> ${renderUser(after.owner.user)}`);
        if (before.verificationLevel != after.verificationLevel) list["verificationLevel"] = entry([verificationLevels[before.verificationLevel], verificationLevels[after.verificationLevel]], `${verificationLevels[before.verificationLevel]} -> ${verificationLevels[after.verificationLevel]}`);
        if (before.explicitContentFilter != after.explicitContentFilter) list["explicitContentFilter"] = entry([explicitContentFilterLevels[before.explicitContentFilter], explicitContentFilterLevels[after.explicitContentFilter]], `${explicitContentFilterLevels[before.explicitContentFilter]} -> ${explicitContentFilterLevels[after.explicitContentFilter]}`);
        if (before.mfaLevel != after.mfaLevel) list["2 factor authentication"] = entry([MFALevels[before.mfaLevel], MFALevels[after.mfaLevel]], `${MFALevels[before.mfaLevel]} -> ${MFALevels[after.mfaLevel]}`);

        if (!(Object.keys(list).length)) return;
        list["updated"] = entry(new Date().getTime(), renderDelta(new Date().getTime()))
        list["updatedBy"] = entry(audit.executor.id, renderUser(audit.executor))
        let data = {
            meta: {
                type: 'guildUpdate',
                displayName: 'Guild Edited',
                calculateType: 'guildUpdate',
                color: NucleusColors.yellow,
                emoji: "GUILD.YELLOW",
                timestamp: new Date().getTime()
            },
            list: list,
            hidden: {
                guild: after.id
            }
        }
        log(data);
    } catch (e) {}
}
