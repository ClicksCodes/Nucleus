import type { HaikuClient } from "../utils/haiku/index.js";
import type { GuildAuditLogsEntry, Sticker } from "discord.js";

export const event = "stickerDelete";

export async function callback(client: HaikuClient, emoji: Sticker) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    const auditLog = await getAuditLog(emoji.guild, "STICKER_CREATE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === emoji.id).first();
    if (audit.executor.id === client.user.id) return;
    const data = {
        meta: {
            type: "stickerCreate",
            displayName: "Sticker Created",
            calculateType: "stickerUpdate",
            color: NucleusColors.green,
            emoji: "GUILD.EMOJI.CREATE",
            timestamp: emoji.createdTimestamp
        },
        list: {
            stickerId: entry(emoji.id, `\`${emoji.id}\``),
            emoji: entry(emoji.name, `\`:${emoji.name}:\``),
            createdBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(emoji.createdTimestamp, renderDelta(emoji.createdTimestamp))
        },
        hidden: {
            guild: emoji.guild!.id
        }
    };
    log(data);
}
