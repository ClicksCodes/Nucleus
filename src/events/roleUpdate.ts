import { AuditLogEvent, Guild, GuildAuditLogsEntry, Role } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import getEmojiByName from "../utils/getEmojiByName.js";

export const event = "roleUpdate";

export async function callback(client: NucleusClient, oldRole: Role, newRole: Role) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderDelta, renderUser, renderRole } = client.logger;
    if (!(await isLogging(newRole.guild.id, "guildRoleUpdate"))) return;
    const auditLog = (await getAuditLog(newRole.guild as Guild, AuditLogEvent.RoleUpdate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as Role)!.id === newRole.id
    )[0];
    if (!auditLog) return;
    if (auditLog.executor!.id === client.user!.id) return;

    const changes: Record<string, ReturnType<typeof entry>> = {
        roleId: entry(newRole.id, `\`${newRole.id}\``),
        role: entry(newRole.id, renderRole(newRole)),
        edited: entry(Date.now(), renderDelta(Date.now())),
        editedBy: entry(
            auditLog.executor!.id,
            renderUser((await newRole.guild.members.fetch(auditLog.executor!.id)).user)
        )
    };
    const mentionable = ["", ""];
    const hoist = ["", ""];
    mentionable[0] = oldRole.mentionable
        ? `${getEmojiByName("CONTROL.TICK")} Yes`
        : `${getEmojiByName("CONTROL.CROSS")} No`;
    mentionable[1] = newRole.mentionable
        ? `${getEmojiByName("CONTROL.TICK")} Yes`
        : `${getEmojiByName("CONTROL.CROSS")} No`;
    hoist[0] = oldRole.hoist ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
    hoist[1] = newRole.hoist ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`;
    if (oldRole.name !== newRole.name)
        changes["name"] = entry([oldRole.name, newRole.name], `${oldRole.name} -> ${newRole.name}`);
    if (oldRole.position !== newRole.position)
        changes["position"] = entry(
            [oldRole.position.toString(), newRole.position.toString()],
            `${oldRole.position} -> ${newRole.position}`
        );
    if (oldRole.hoist !== newRole.hoist)
        changes["showInMemberList"] = entry([oldRole.hoist, newRole.hoist], `${hoist[0]} -> ${hoist[1]}`);
    if (oldRole.mentionable !== newRole.mentionable)
        changes["mentionable"] = entry(
            [oldRole.mentionable, newRole.mentionable],
            `${mentionable[0]} -> ${mentionable[1]}`
        );
    if (oldRole.hexColor !== newRole.hexColor)
        changes["color"] = entry(
            [oldRole.hexColor, newRole.hexColor],
            `\`${oldRole.hexColor}\` -> \`${newRole.hexColor}\``
        );
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        changes["permissions"] = entry(
            [oldRole.permissions.bitfield.toString(), newRole.permissions.bitfield.toString()],
            `[[Old]](https://discordapi.com/permissions.html#${oldRole.permissions.bitfield.toString()}) -> [[New]](https://discordapi.com/permissions.html#${newRole.permissions.bitfield.toString()})`
        );
    }

    if (Object.keys(changes).length === 4) return;

    const data = {
        meta: {
            type: "roleUpdate",
            displayName: "Role Edited",
            calculateType: "guildRoleUpdate",
            color: NucleusColors.yellow,
            emoji: "GUILD.ROLES.EDIT",
            timestamp: auditLog.createdTimestamp
        },
        list: changes,
        hidden: {
            guild: newRole.guild.id
        }
    }; // TODO: make our own page for this
    log(data);
}
