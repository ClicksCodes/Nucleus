import type { HaikuClient } from "../utils/haiku/index.js";
import type { GuildAuditLogsEntry, Role } from "discord.js";

export const event = "roleCreate";

export async function callback(client: HaikuClient, role: Role) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderRole } = client.logger;
    if (role.managed) return;
    const auditLog = await getAuditLog(role.guild, "ROLE_CREATE");
    const audit = auditLog.entries.filter((entry: GuildAuditLogsEntry) => entry.target!.id === role.id).first();
    if (audit.executor.id === client.user.id) return;
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
            createdBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(role.createdTimestamp, renderDelta(role.createdTimestamp))
        },
        hidden: {
            guild: role.guild.id
        }
    };
    log(data);
}
