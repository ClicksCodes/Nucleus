import { AuditLogEvent } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import type { GuildEmoji, GuildAuditLogsEntry } from "discord.js";
export const event = "emojiUpdate";

export async function callback(client: NucleusClient, oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
    const { getAuditLog, log, isLogging, NucleusColors, entry, renderUser, renderDelta, renderEmoji } = client.logger;
    if (!(await isLogging(newEmoji.guild.id, "emojiUpdate"))) return;

    const auditLog = (await getAuditLog(newEmoji.guild, AuditLogEvent.EmojiUpdate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as GuildEmoji)!.id === newEmoji.id
    )[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;

    const changes = {
        emojiId: entry(newEmoji.id, `\`${newEmoji.id}\``),
        emoji: entry(newEmoji.id, renderEmoji(newEmoji)),
        edited: entry(newEmoji.createdTimestamp, renderDelta(newEmoji.createdTimestamp)),
        editedBy: entry(
            auditLog.executor!.id,
            renderUser((await newEmoji.guild.members.fetch(auditLog.executor!.id)).user)
        ),
        name: entry([oldEmoji.name!, newEmoji.name!], `\`:${oldEmoji.name}:\` -> \`:${newEmoji.name}:\``)
    };
    const data = {
        meta: {
            type: "emojiUpdate",
            displayName: "Emoji Edited",
            calculateType: "emojiUpdate",
            color: NucleusColors.yellow,
            emoji: "GUILD.EMOJI.EDIT",
            timestamp: auditLog.createdTimestamp
        },
        list: changes,
        hidden: {
            guild: newEmoji.guild.id
        }
    };
    log(data);
}
