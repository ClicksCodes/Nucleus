import { AuditLogEvent, GuildAuditLogsEntry, ThreadChannel } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";

export const event = "threadUpdate";

export async function callback(client: NucleusClient, oldThread: ThreadChannel, newThread: ThreadChannel) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    if (!(await isLogging(newThread.guild.id, "channelUpdate"))) return;
    const auditLog = (await getAuditLog(newThread.guild, AuditLogEvent.ThreadUpdate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as ThreadChannel)!.id === newThread.id
    )[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const list: Record<string, ReturnType<typeof entry>> = {
        threadId: entry(newThread.id, `\`${newThread.id}\``),
        thread: entry(newThread.name, renderChannel(newThread)),
        parentChannel: entry(newThread.parentId, renderChannel(newThread.parent!))
    };
    if (oldThread.name !== newThread.name) {
        list["name"] = entry([oldThread.name, newThread.name], `${oldThread.name} -> ${newThread.name}`);
    }
    if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
        list["autoArchiveDuration"] = entry(
            [oldThread.autoArchiveDuration!.toString(), newThread.autoArchiveDuration!.toString()],
            `${humanizeDuration((oldThread.autoArchiveDuration ?? 0) * 60 * 1000, {
                round: true
            })} -> ${humanizeDuration((newThread.autoArchiveDuration ?? 0) * 60 * 1000, {
                round: true
            })}`
        );
    }
    if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
        list["slowmode"] = entry(
            [oldThread.rateLimitPerUser!.toString(), newThread.rateLimitPerUser!.toString()],
            `${humanizeDuration((oldThread.rateLimitPerUser ?? 0) * 1000)} -> ${humanizeDuration(
                (newThread.rateLimitPerUser ?? 0) * 1000
            )}`
        );
    }
    if (!(Object.keys(list).length - 3)) return;
    list["updated"] = entry(Date.now(), renderDelta(Date.now()));
    list["updatedBy"] = entry(auditLog.executor!.id, renderUser(auditLog.executor!));
    const data = {
        meta: {
            type: "channelUpdate",
            displayName: "Thread Edited",
            calculateType: "channelUpdate",
            color: NucleusColors.yellow,
            emoji: "CHANNEL.TEXT.EDIT",
            timestamp: Date.now()
        },
        list: list,
        hidden: {
            guild: newThread.guild.id
        }
    };
    await log(data);
}
