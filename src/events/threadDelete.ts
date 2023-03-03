import { AuditLogEvent, GuildAuditLogsEntry, ThreadChannel } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";
export const event = "threadDelete";

export async function callback(client: NucleusClient, thread: ThreadChannel) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    if (!await isLogging(thread.guild.id, "channelUpdate")) return;
    const auditLog = (await getAuditLog(thread.guild, AuditLogEvent.ThreadDelete))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as ThreadChannel)!.id === thread.id)[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const category = thread.parent
        ? entry(
              thread.parent.parent ? thread.parent.parent.name : "None",
              thread.parent.parent ? renderChannel(thread.parent.parent) : "None"
          )
        : entry(null, "Uncategorised");
    const data = {
        meta: {
            type: "channelDelete",
            displayName: "Thread Deleted",
            calculateType: "channelUpdate",
            color: NucleusColors.red,
            emoji: "CHANNEL.TEXT.DELETE",
            timestamp: Date.now()
        },
        list: {
            threadId: entry(thread.id, `\`${thread.id}\``),
            name: entry(thread.name, thread.name),
            parentChannel: entry(thread.parentId, thread.parent ? renderChannel(thread.parent) : "*None*"),
            category: category,
            autoArchiveDuration: entry(
                thread.autoArchiveDuration,
                humanizeDuration((thread.autoArchiveDuration ?? 0) * 60 * 1000, {
                    round: true
                })
            ),
            membersInThread: entry(thread.memberCount, thread.memberCount!.toString()),
            deletedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(thread.createdTimestamp, renderDelta(thread.createdTimestamp!)),
            deleted: entry(Date.now(), renderDelta(Date.now()))
        },
        hidden: {
            guild: thread.guild.id
        }
    };
    log(data);
}
