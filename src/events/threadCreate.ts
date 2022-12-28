import type { GuildAuditLogsEntry, ThreadChannel } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { HaikuClient } from "../utils/haiku/index.js";
export const event = "threadCreate";

export async function callback(client: HaikuClient, thread: ThreadChannel) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    const auditLog = await getAuditLog(thread.guild, "THREAD_CREATE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === thread.id).first();
    if (audit.executor.id === client.user.id) return;
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
            timestamp: thread.createdTimestamp
        },
        list: {
            threadId: entry(thread.id, `\`${thread.id}\``),
            name: entry(thread.name, renderChannel(thread)),
            parentChannel: entry(thread.parentId, renderChannel(thread.parent)),
            category: category,
            autoArchiveDuration: entry(
                thread.autoArchiveDuration,
                humanizeDuration((thread.autoArchiveDuration ?? 0) * 60 * 1000, {
                    round: true
                })
            ),
            createdBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(thread.createdTimestamp, renderDelta(thread.createdTimestamp))
        },
        hidden: {
            guild: thread.guild.id
        }
    };
    log(data);
}
