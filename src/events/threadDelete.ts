import { AuditLogEvent, GuildAuditLogsEntry, ThreadChannel } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { NucleusClient } from "../utils/client.js";
export const event = "threadDelete";

export async function callback(client: NucleusClient, thread: ThreadChannel) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
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
            timestamp: new Date().getTime()
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
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
        },
        hidden: {
            guild: thread.guild.id
        }
    };
    log(data);
}
