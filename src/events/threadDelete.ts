import type { GuildAuditLogsEntry, ThreadChannel } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
// @ts-expect-error
import type { HaikuClient } from "jshaiku"
export const event = "threadDelete";

export async function callback(client: HaikuClient, thread: ThreadChannel) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    const auditLog = await getAuditLog(thread.guild, "THREAD_UPDATE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === thread.id).first();
    if (audit.executor.id === client.user.id) return;
    const category = thread.parent ? entry(
            thread.parent.parent ? thread.parent.parent.name : "None",
            thread.parent.parent ? renderChannel(thread.parent.parent) : "None"
        ) : entry(null, "Uncategorised")
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
            membersInThread: entry(thread.memberCount, thread.memberCount),
            deletedBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(thread.createdTimestamp, renderDelta(thread.createdTimestamp)),
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
        },
        hidden: {
            guild: thread.guild.id
        }
    };
    log(data);
}
