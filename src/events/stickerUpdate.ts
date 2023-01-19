import type { NucleusClient } from "../utils/client.js";
import { AuditLogEvent, GuildAuditLogsEntry, Sticker } from "discord.js";

export const event = "stickerUpdate";

export async function callback(client: NucleusClient, oldSticker: Sticker, newSticker: Sticker) {
    const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser } = client.logger;

    if (oldSticker.name === newSticker.name) return;
    const auditLog = (await getAuditLog(newSticker.guild!, AuditLogEvent.StickerUpdate))
        .filter((entry: GuildAuditLogsEntry) => (entry.target as Sticker)!.id === newSticker.id)[0]!;
    if (auditLog.executor!.id === client.user!.id) return;

    const changes = {
        stickerId: entry(newSticker.id, `\`${newSticker.id}\``),
        edited: entry(newSticker.createdTimestamp, renderDelta(newSticker.createdTimestamp)),
        editedBy: entry(auditLog.executor!.id, renderUser((await newSticker.guild!.members.fetch(auditLog.executor!.id)).user)),
        name: entry([oldSticker.name, newSticker.name], `\`:${oldSticker.name}:\` -> \`:${newSticker.name}:\``)
    };
    const data = {
        meta: {
            type: "stickerUpdate",
            displayName: "Sticker Edited",
            calculateType: "stickerUpdate",
            color: NucleusColors.yellow,
            emoji: "GUILD.EMOJI.EDIT",
            timestamp: auditLog.createdTimestamp
        },
        list: changes,
        hidden: {
            guild: newSticker.guild!.id
        }
    };
    log(data);
}
