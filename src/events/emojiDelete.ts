import { AuditLogEvent } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import type { GuildEmoji, GuildAuditLogsEntry } from "discord.js";
export const event = "emojiDelete";

export async function callback(client: NucleusClient, emoji: GuildEmoji) {
    const { getAuditLog, log, isLogging, NucleusColors, entry, renderUser, renderDelta, renderEmoji } = client.logger;
    if (!(await isLogging(emoji.guild.id, "emojiUpdate"))) return;
    const auditLog = (await getAuditLog(emoji.guild, AuditLogEvent.EmojiDelete)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as GuildEmoji)!.id === emoji.id
    )[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;
    const data = {
        meta: {
            type: "emojiDelete",
            displayName: "Emoji Deleted",
            calculateType: "emojiUpdate",
            color: NucleusColors.red,
            emoji: "GUILD.EMOJI.DELETE",
            timestamp: auditLog.createdTimestamp
        },
        list: {
            emojiId: entry(emoji.id, `\`${emoji.id}\``),
            emoji: entry(emoji.name, renderEmoji(emoji)),
            deletedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(emoji.createdTimestamp, renderDelta(emoji.createdTimestamp)),
            deleted: entry(auditLog.createdTimestamp, renderDelta(auditLog.createdTimestamp))
        },
        hidden: {
            guild: emoji.guild.id
        }
    };
    log(data);
}
