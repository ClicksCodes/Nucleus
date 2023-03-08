import { AuditLogEvent, GuildAuditLogsEntry, ThreadChannel } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";
export const event = "threadCreate";

export async function callback(client: NucleusClient, thread: ThreadChannel) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    if (!(await isLogging(thread.guild.id, "channelUpdate"))) return;
    const auditLog = (await getAuditLog(thread.guild, AuditLogEvent.ThreadCreate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as ThreadChannel)!.id === thread.id
    )[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const category = thread.parent
        ? entry(
              thread.parent.parent ? thread.parent.parent.name : "None",
              thread.parent.parent ? renderChannel(thread.parent.parent) : "None"
          )
        : entry(null, "Uncategorised");
    const data = {
        meta: {
            type: "channelCreate",
            displayName: "Thread Created",
            calculateType: "channelUpdate",
            color: NucleusColors.green,
            emoji: "CHANNEL.TEXT.CREATE",
            timestamp: thread.createdTimestamp ?? Date.now()
        },
        list: {
            threadId: entry(thread.id, `\`${thread.id}\``),
            name: entry(thread.name, renderChannel(thread)),
            parentChannel: entry(thread.parentId, renderChannel(thread.parent!)),
            category: category,
            autoArchiveDuration: entry(
                thread.autoArchiveDuration,
                humanizeDuration((thread.autoArchiveDuration ?? 0) * 60 * 1000, {
                    round: true
                })
            ),
            createdBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(thread.createdTimestamp, renderDelta(thread.createdTimestamp!))
        },
        hidden: {
            guild: thread.guild.id
        }
    };
    await log(data);
}
