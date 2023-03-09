import getEmojiByName from "../utils/getEmojiByName.js";
import type { NucleusClient } from "../utils/client.js";
import { AuditLogEvent, Guild, GuildAuditLogsEntry, Role } from "discord.js";

export const event = "roleDelete";

export async function callback(client: NucleusClient, role: Role) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    if (!(await isLogging(role.guild.id, "guildRoleUpdate"))) return;
    if (role.managed) return;
    const auditLog = (await getAuditLog(role.guild as Guild, AuditLogEvent.RoleDelete)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as Role)!.id === role.id
    )[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const data = {
        meta: {
            type: "roleDelete",
            displayName: "Role Deleted",
            calculateType: "guildRoleUpdate",
            color: NucleusColors.red,
            emoji: "GUILD.ROLES.DELETE",
            timestamp: auditLog.createdTimestamp
        },
        list: {
            roleId: entry(role.id, `\`${role.id}\``),
            role: entry(role.name, role.name),
            color: entry(role.hexColor, `\`${role.hexColor}\``),
            showInMemberList: entry(
                role.hoist,
                role.hoist ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`
            ),
            mentionable: entry(
                role.mentionable,
                role.mentionable ? `${getEmojiByName("CONTROL.TICK")} Yes` : `${getEmojiByName("CONTROL.CROSS")} No`
            ),
            members: entry(role.members.size, `${role.members.size}`),
            deletedBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(role.createdTimestamp, renderDelta(role.createdTimestamp)),
            deleted: entry(Date.now(), renderDelta(Date.now()))
        },
        hidden: {
            guild: role.guild.id
        }
    };
    await log(data);
}
