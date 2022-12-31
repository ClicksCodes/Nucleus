import type { GuildAuditLogsEntry, ThreadChannel } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";

export const event = "threadUpdate";

export async function callback(client: NucleusClient, before: ThreadChannel, after: ThreadChannel) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    const auditLog = await getAuditLog(after.guild, "THREAD_UPDATE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === after.id).first();
    if (audit.executor.id === client.user.id) return;
    const list: Record<string, ReturnType<typeof entry>> = {
        threadId: entry(after.id, `\`${after.id}\``),
        thread: entry(after.name, renderChannel(after)),
        parentChannel: entry(after.parentId, renderChannel(after.parent))
    };
    if (before.name !== after.name) {
        list["name"] = entry([before.name, after.name], `${before.name} -> ${after.name}`);
    }
    if (before.autoArchiveDuration !== after.autoArchiveDuration) {
        list["autoArchiveDuration"] = entry(
            [before.autoArchiveDuration, after.autoArchiveDuration],
            `${humanizeDuration((before.autoArchiveDuration ?? 0) * 60 * 1000, {
                round: true
            })} -> ${humanizeDuration((after.autoArchiveDuration ?? 0) * 60 * 1000, {
                round: true
            })}`
        );
    }
    if (before.rateLimitPerUser !== after.rateLimitPerUser) {
        list["slowmode"] = entry(
            [before.rateLimitPerUser, after.rateLimitPerUser],
            `${humanizeDuration((before.rateLimitPerUser ?? 0) * 1000)} -> ${humanizeDuration(
                (after.rateLimitPerUser ?? 0) * 1000
            )}`
        );
    }
    if (!(Object.keys(list).length - 3)) return;
    list["updated"] = entry(new Date().getTime(), renderDelta(new Date().getTime()));
    list["updatedBy"] = entry(audit.executor.id, renderUser(audit.executor));
    const data = {
        meta: {
            type: "channelUpdate",
            displayName: "Thread Edited",
            calculateType: "channelUpdate",
            color: NucleusColors.yellow,
            emoji: "CHANNEL.TEXT.EDIT",
            timestamp: new Date().getTime()
        },
        list: list,
        hidden: {
            guild: after.guild.id
        }
    };
    log(data);
}
