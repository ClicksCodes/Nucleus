import getEmojiByName from "../utils/getEmojiByName.js";

export const event = "roleDelete";

export async function callback(client, role) {
    const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = role.client.logger;
    if (role.managed) return;
    const auditLog = await getAuditLog(role.guild, "ROLE_DELETE");
    const audit = auditLog.entries.filter((entry) => entry.target.id === role.id).first();
    if (audit.executor.id === client.user.id) return;
    const data = {
        meta: {
            type: "roleDelete",
            displayName: "Role Deleted",
            calculateType: "guildRoleUpdate",
            color: NucleusColors.red,
            emoji: "GUILD.ROLES.DELETE",
            timestamp: audit.createdTimestamp
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
            deletedBy: entry(audit.executor.id, renderUser(audit.executor)),
            created: entry(role.createdTimestamp, renderDelta(role.createdTimestamp)),
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
        },
        hidden: {
            guild: role.guild.id
        }
    };
    log(data);
}
