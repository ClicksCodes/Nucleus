import type { NucleusClient } from "../utils/client.js";
import { AuditLogEvent, Guild, GuildAuditLogsEntry, Role } from "discord.js";

export const event = "roleCreate";

export async function callback(client: NucleusClient, role: Role) {
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta, renderRole } = client.logger;
    if (!(await isLogging(role.guild.id, "guildRoleUpdate"))) return;
    if (role.managed) return;
    const auditLog = (await getAuditLog(role.guild as Guild, AuditLogEvent.RoleCreate)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target as Role)!.id === role.id
    )[0]!;
    if (auditLog.executor!.id === client.user!.id) return;
    const data = {
        meta: {
            type: "roleCreate",
            displayName: "Role Created",
            calculateType: "guildRoleUpdate",
            color: NucleusColors.green,
            emoji: "GUILD.ROLES.CREATE",
            timestamp: role.createdTimestamp
        },
        list: {
            roleId: entry(role.id, `\`${role.id}\``),
            role: entry(role.name, renderRole(role)),
            createdBy: entry(auditLog.executor!.id, renderUser(auditLog.executor!)),
            created: entry(role.createdTimestamp, renderDelta(role.createdTimestamp))
        },
        hidden: {
            guild: role.guild.id
        }
    };
    log(data);
}
