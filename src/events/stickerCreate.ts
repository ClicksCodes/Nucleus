import type { NucleusClient } from "../utils/client.js";
import { AuditLogEvent, GuildAuditLogsEntry, Sticker } from "discord.js";

export const event = "stickerDelete";

export async function callback(client: NucleusClient, sticker: Sticker) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    const auditLog = (await getAuditLog(sticker.guild!, AuditLogEvent.EmojiCreate))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as Sticker)!.id === sticker.id)[0] as GuildAuditLogsEntry;
    if (auditLog.executor!.id === client.user!.id) return;
    const data = {
        meta: {
            type: "stickerCreate",
            displayName: "Sticker Created",
            calculateType: "stickerUpdate",
            color: NucleusColors.green,
            emoji: "GUILD.EMOJI.CREATE",
            timestamp: sticker.createdTimestamp
        },
        list: {
            stickerId: entry(sticker.id, `\`${sticker.id}\``),
            emoji: entry(sticker.name, `\`:${sticker.name}:\``),
            createdBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(sticker.createdTimestamp, renderDelta(sticker.createdTimestamp))
        },
        hidden: {
            guild: sticker.guild!.id
        }
    };
    log(data);
}
