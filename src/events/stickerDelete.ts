import type { NucleusClient } from "../utils/client.js";
import { AuditLogEvent, GuildAuditLogsEntry, Sticker } from "discord.js";

export const event = "stickerDelete";

export async function callback(client: NucleusClient, sticker: Sticker) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    if (!(await isLogging(sticker.guild!.id, "stickerUpdate"))) return;
    const auditLog = (await getAuditLog(sticker.guild!, AuditLogEvent.StickerDelete)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as Sticker)!.id === sticker.id
    )[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const data = {
        meta: {
            type: "stickerDelete",
            displayName: "Sticker Deleted",
            calculateType: "stickerUpdate",
            color: NucleusColors.red,
            emoji: "GUILD.EMOJI.DELETE",
            timestamp: auditLog.createdTimestamp
        },
        list: {
            stickerId: entry(sticker.id, `\`${sticker.id}\``),
            sticker: entry(sticker.name, `\`${sticker.name}\``),
            deletedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(sticker.createdTimestamp, renderDelta(sticker.createdTimestamp)),
            deleted: entry(auditLog.createdTimestamp, renderDelta(auditLog.createdTimestamp))
        },
        hidden: {
            guild: sticker.guild!.id
        }
    };
    log(data);
}
