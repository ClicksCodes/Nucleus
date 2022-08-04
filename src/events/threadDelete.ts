import humanizeDuration from "humanize-duration";
export const event = "threadDelete";

export async function callback(client, thread) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = thread.client.logger;
    const auditLog = await getAuditLog(thread.guild, "THREAD_UPDATE");
    const audit = auditLog.entries.filter(entry => entry.target.id === thread.id).first();
    if (audit.executor.id === client.user.id) return;
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
            threadId:entry(thread.id, `\`${thread.id}\``),
            name: entry(thread.name, thread.name),
            parentChannel: entry(thread.parentId, renderChannel(thread.parent)),
            category: entry(thread.parent.parent ? thread.parent.parent.name : "None", thread.parent.parent ? renderChannel(thread.parent.parent) : "None"),
            autoArchiveDuration: entry(thread.autoArchiveDuration, humanizeDuration(thread.autoArchiveDuration * 60 * 1000, { round: true })),
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
