import type { NucleusClient } from "../utils/client.js";
import { AuditLogEvent, Guild, GuildAuditLogsEntry } from "discord.js";
import { callback as statsChannelUpdate } from "../reflex/statsChannelUpdate.js";

export const event = "guildUpdate";

export async function callback(client: NucleusClient, before: Guild, after: Guild) {
    await statsChannelUpdate(after.members.me!.user, after);
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    if (!(await isLogging(after.id, "guildUpdate"))) return;
    const auditLog = (await getAuditLog(after, AuditLogEvent.GuildUpdate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as Guild)!.id === after.id
    )[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const list: Record<string, ReturnType<typeof entry>> = {};

    const verificationLevels = [
        "Unrestricted",
        "Verified email",
        "Registered (5 minutes)",
        "Member (10 minutes)",
        "Verified phone"
    ];

    const explicitContentFilterLevels = ["Disabled", "Members without roles", "All members"];

    const MFALevels = ["None", "Enabled"];

    const beforeOwner = await before.fetchOwner();
    const afterOwner = await after.fetchOwner();

    if (before.name !== after.name) list["name"] = entry([before.name, after.name], `${before.name} -> ${after.name}`);
    if (before.icon !== after.icon)
        list["icon"] = entry(
            [before.icon!, after.icon!],
            `[Before](${before.iconURL()}) -> [After](${after.iconURL()})`
        );
    if (before.splash !== after.splash)
        list["splash"] = entry(
            [before.splash!, after.splash!],
            `[Before](${before.splashURL()}) -> [After](${after.splashURL()})`
        );
    if (before.banner !== after.banner)
        list["banner"] = entry(
            [before.banner!, after.banner!],
            `[Before](${before.bannerURL()}) -> [After](${after.bannerURL()})`
        );
    if (beforeOwner !== afterOwner)
        list["owner"] = entry(
            [beforeOwner.id, afterOwner.id],
            `${renderUser(beforeOwner.user)} -> ${renderUser(afterOwner.user)}`
        );
    if (before.verificationLevel !== after.verificationLevel)
        list["verificationLevel"] = entry(
            [
                verificationLevels[before.verificationLevel.valueOf()]!,
                verificationLevels[before.verificationLevel.valueOf()]!
            ],
            `${verificationLevels[before.verificationLevel.valueOf()]} -> ${
                verificationLevels[before.verificationLevel.valueOf()]
            }`
        );
    if (before.explicitContentFilter !== after.explicitContentFilter)
        list["explicitContentFilter"] = entry(
            [
                explicitContentFilterLevels[before.explicitContentFilter.valueOf()]!,
                explicitContentFilterLevels[after.explicitContentFilter.valueOf()]!
            ],
            `${explicitContentFilterLevels[before.explicitContentFilter]} -> ${
                explicitContentFilterLevels[after.explicitContentFilter]
            }`
        );
    if (before.mfaLevel !== after.mfaLevel)
        list["2 factor authentication"] = entry(
            [MFALevels[before.mfaLevel.valueOf()]!, MFALevels[after.mfaLevel.valueOf()]!],
            `${MFALevels[before.mfaLevel.valueOf()]} -> ${MFALevels[after.mfaLevel.valueOf()]}`
        );

    if (!Object.keys(list).length) return;
    list["updated"] = entry(Date.now(), renderDelta(Date.now()));
    list["updatedBy"] = entry(auditLog.executor!.id, renderUser(auditLog.executor!));
    const data = {
        meta: {
            type: "guildUpdate",
            displayName: "Server Edited",
            calculateType: "guildUpdate",
            color: NucleusColors.yellow,
            emoji: "GUILD.YELLOW",
            timestamp: Date.now()
        },
        list: list,
        hidden: {
            guild: after.id
        }
    };
    await log(data);
}
