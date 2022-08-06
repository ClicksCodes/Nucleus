export const event = "emojiCreate";

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
    const auditLog = await getAuditLog(emoji.guild, "EMOJI_CREATE");
    const audit = auditLog.entries
        .filter((entry) => entry.target.id === emoji.id)
        .first();
    if (audit.executor.id === client.user.id) return;
    const data = {
        meta: {
            type: "emojiCreate",
            displayName: "Emoji Created",
            calculateType: "emojiUpdate",
            color: NucleusColors.green,
            emoji: "GUILD.EMOJI.CREATE",
            timestamp: emoji.createdTimestamp
        },
        list: {
            emojiId: entry(emoji.id, `\`${emoji.id}\``),
            emoji: entry(emoji.name, renderEmoji(emoji)),
            createdBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(
                emoji.createdTimestamp,
                renderDelta(emoji.createdTimestamp)
            )
        },
        hidden: {
            guild: emoji.guild.id
        }
    };
    log(data);
}
