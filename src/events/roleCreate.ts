export const event = "roleCreate";

export async function callback(client, role) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderRole } = role.client.logger;
    if (role.managed) return;
    const auditLog = await getAuditLog(role.guild, "ROLE_CREATE");
    const audit = auditLog.entries.filter((entry) => entry.target.id === role.id).first();
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
