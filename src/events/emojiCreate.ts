import { AuditLogEvent } from 'discord.js';
import type { NucleusClient } from "../utils/client.js";
import type { GuildEmoji, GuildAuditLogsEntry } from 'discord.js'
export const event = "emojiCreate";

export async function callback(client: NucleusClient, emoji: GuildEmoji) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderEmoji } = client.logger;
    const auditLog = (await getAuditLog(emoji.guild, AuditLogEvent.EmojiCreate))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as GuildEmoji)!.id === emoji.id)[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;
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
            createdBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(emoji.createdTimestamp, renderDelta(emoji.createdTimestamp))
        },
        hidden: {
            guild: emoji.guild.id
        }
    };
    log(data);
}

