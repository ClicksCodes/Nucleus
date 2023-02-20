import type { NucleusClient } from "../utils/client.js";
import { AuditLogEvent, GuildAuditLogsEntry, Sticker } from "discord.js";
import { generalException } from "../utils/createTemporaryStorage.js";

export const event = "stickerCreate";

export async function callback(client: NucleusClient, sticker: Sticker) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    if (!await isLogging(sticker.guild!.id, "stickerUpdate")) return;
    const auditLog = (await getAuditLog(sticker.guild!, AuditLogEvent.StickerCreate))
    .filter((entry: GuildAuditLogsEntry) => (entry.target as Sticker)!.id === sticker.id)[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    if (client.noLog.includes(`${sticker.guild!.id}${auditLog.id}`)) return;
    generalException(`${sticker.guild!.id}${auditLog.id}`);
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
