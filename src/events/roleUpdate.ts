import type { Role } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import getEmojiByName from "../utils/getEmojiByName.js";

export const event = "roleUpdate";

export async function callback(client: NucleusClient, or: Role, nr: Role) {
    const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser, renderRole } = client.logger;

    const auditLog = await getAuditLog(nr.guild, "ROLE_UPDATE");
    const audit = auditLog.entries.first();
    if (audit.executor.id === client.user.id) return;

    const changes: Record<string, ReturnType<typeof entry>> = {
        roleId: entry(nr.id, `\`${nr.id}\``),
        role: entry(nr.id, renderRole(nr)),
        edited: entry(new Date().getTime(), renderDelta(new Date().getTime())),
        editedBy: entry(audit.executor.id, renderUser((await nr.guild.members.fetch(audit.executor.id)).user))
    };
    const mentionable = ["", ""];
    const hoist = ["", ""];
    mentionable[0] = or.mentionable ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
    mentionable[1] = nr.mentionable ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
    hoist[0] = or.hoist ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
    hoist[1] = nr.hoist ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
    if (or.name !== nr.name) changes["name"] = entry([or.name, nr.name], `${or.name} -> ${nr.name}`);
    if (or.position !== nr.position)
        changes["position"] = entry([or.position, nr.position], `${or.position} -> ${nr.position}`);
    if (or.hoist !== nr.hoist) changes["showInMemberList"] = entry([or.hoist, nr.hoist], `${hoist[0]} -> ${hoist[1]}`);
    if (or.mentionable !== nr.mentionable)
        changes["mentionable"] = entry([or.mentionable, nr.mentionable], `${mentionable[0]} -> ${mentionable[1]}`);
    if (or.hexColor !== nr.hexColor)
        changes["color"] = entry([or.hexColor, nr.hexColor], `\`${or.hexColor}\` -> \`${nr.hexColor}\``);

    if (Object.keys(changes).length === 4) return;

    const data = {
        meta: {
            type: "roleUpdate",
            displayName: "Role Edited",
            calculateType: "guildRoleUpdate",
            color: NucleusColors.yellow,
            emoji: "GUILD.ROLES.EDIT",
            timestamp: audit.createdTimestamp
        },
        list: changes,
        hidden: {
            guild: nr.guild.id
        }
    }; // TODO: show perms changed (webpage)
    log(data);
}
