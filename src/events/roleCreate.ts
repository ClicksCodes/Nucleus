export const event = 'roleCreate'

export async function callback(client, role) {
	const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderRole } = role.client.logger
    let auditLog = await getAuditLog(role.guild, 'ROLE_CREATE');
    let audit = auditLog.entries.filter(entry => entry.target.id == role.id).first();
    if (audit.executor.id == client.user.id) return;
    let data = {
        meta: {
            type: 'roleCreate',
            displayName: 'Role Created',
            calculateType: 'guildRoleUpdate',
            color: NucleusColors.green,
            emoji: "GUILD.ROLES.CREATE",
            timestamp: role.createdTimestamp
        },
        list: {
            id: entry(role.id, `\`${role.id}\``),
            role: entry(role.name, renderRole(role)),
            createdBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(role.createdTimestamp, renderDelta(role.createdTimestamp))
        },
        hidden: {
            guild: role.guild.id
        }
    }
    log(data, client);
}
