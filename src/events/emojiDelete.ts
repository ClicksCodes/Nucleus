export const event = "emojiDelete";

export async function callback(client, emoji) {
    const {
        getAuditLog,
        log,
        NucleusColors,
        entry,
        renderUser,
        renderDelta,
        renderEmoji
    } = emoji.client.logger;
    const auditLog = await getAuditLog(emoji.guild, "EMOJI_DELETE");
    const audit = auditLog.entries
        .filter((entry) => entry.target.id === emoji.id)
        .first();
    if (audit.executor.id === client.user.id) return;
    const data = {
        meta: {
            type: "emojiDelete",
            displayName: "Emoji Deleted",
            calculateType: "emojiUpdate",
            color: NucleusColors.red,
            emoji: "GUILD.EMOJI.DELETE",
            timestamp: audit.createdTimestamp
        },
        list: {
            emojiId: entry(emoji.id, `\`${emoji.id}\``),
            emoji: entry(emoji.name, renderEmoji(emoji)),
            deletedBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(
                emoji.createdTimestamp,
                renderDelta(emoji.createdTimestamp)
            ),
            deleted: entry(
                audit.createdTimestamp,
                renderDelta(audit.createdTimestamp)
            )
        },
        hidden: {
            guild: emoji.guild.id
        }
    };
    log(data);
}
