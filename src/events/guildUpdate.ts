// @ts-expect-error
import type { HaikuClient } from "jshaiku";
import type { Guild, GuildAuditLogsEntry } from 'discord.js';
import { callback as statsChannelUpdate } from "../reflex/statsChannelUpdate.js";

export const event = "guildUpdate";

export async function callback(client: HaikuClient, before: Guild, after: Guild) {
    await statsChannelUpdate(client, after.me!);
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    const auditLog = await getAuditLog(after, "GUILD_UPDATE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === after.id).first();
    if (audit.executor.id === client.user.id) return;
    const list: Record<string, ReturnType<typeof entry>> = {};

    const verificationLevels = {
        NONE: "Unrestricted",
        LOW: "Verified email",
        MEDIUM: "Registered (5 minutes)",
        HIGH: "Member (10 minutes)",
        VERY_HIGH: "Verified phone"
    };

    const explicitContentFilterLevels = {
        DISABLED: "Disabled",
        MEMBERS_WITHOUT_ROLES: "Members without roles",
        ALL_MEMBERS: "All members"
    };

    const MFALevels = {
        NONE: "None",
        ELEVATED: "Enabled"
    };
    const beforeOwner = await before.fetchOwner()
    const afterOwner = await after.fetchOwner()

    if (before.name !== after.name) list["name"] = entry([before.name, after.name], `${before.name} -> ${after.name}`);
    if (before.icon !== after.icon)
        list["icon"] = entry([before.icon, after.icon], `[Before](${before.iconURL()}) -> [After](${after.iconURL()})`);
    if (before.splash !== after.splash)
        list["splash"] = entry(
            [before.splash, after.splash],
            `[Before](${before.splashURL()}) -> [After](${after.splashURL()})`
        );
    if (before.banner !== after.banner)
        list["banner"] = entry(
            [before.banner, after.banner],
            `[Before](${before.bannerURL()}) -> [After](${after.bannerURL()})`
        );
    if (beforeOwner !== afterOwner)
        list["owner"] = entry(
            [beforeOwner, afterOwner],
            `${renderUser(beforeOwner.user)} -> ${renderUser(afterOwner.user)}`
        );
    if (before.verificationLevel !== after.verificationLevel)
        list["verificationLevel"] = entry(
            [verificationLevels[before.verificationLevel], verificationLevels[after.verificationLevel]],
            `${verificationLevels[before.verificationLevel]} -> ${verificationLevels[after.verificationLevel]}`
        );
    if (before.explicitContentFilter !== after.explicitContentFilter)
        list["explicitContentFilter"] = entry(
            [
                explicitContentFilterLevels[before.explicitContentFilter],
                explicitContentFilterLevels[after.explicitContentFilter]
            ],
            `${explicitContentFilterLevels[before.explicitContentFilter]} -> ${
                explicitContentFilterLevels[after.explicitContentFilter]
            }`
        );
    if (before.mfaLevel !== after.mfaLevel)
        list["2 factor authentication"] = entry(
            [MFALevels[before.mfaLevel], MFALevels[after.mfaLevel]],
            `${MFALevels[before.mfaLevel]} -> ${MFALevels[after.mfaLevel]}`
        );

    if (!Object.keys(list).length) return;
    list["updated"] = entry(new Date().getTime(), renderDelta(new Date().getTime()));
    list["updatedBy"] = entry(audit.executor.id, renderUser(audit.executor));
    const data = {
        meta: {
            type: "guildUpdate",
            displayName: "Guild Edited",
            calculateType: "guildUpdate",
            color: NucleusColors.yellow,
            emoji: "GUILD.YELLOW",
            timestamp: new Date().getTime()
        },
        list: list,
        hidden: {
            guild: after.id
        }
    };
    log(data);
}