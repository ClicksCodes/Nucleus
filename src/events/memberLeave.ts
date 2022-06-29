import humanizeDuration from 'humanize-duration';
import { purgeByUser } from '../automations/tickets/delete.js';
import { callback as statsChannelRemove } from '../automations/statsChannelRemove.js';

export const event = 'guildMemberRemove'

export async function callback(client, member) {
    try { await statsChannelRemove(client, member); } catch {}
    try { purgeByUser(member.id, member.guild); } catch {}
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta } = member.client.logger
        let auditLog = await getAuditLog(member.guild, 'MEMBER_KICK');
        let audit = auditLog.entries.filter(entry => entry.target.id == member.id).first();
        let type = "leave"
        if (audit) {
            if (audit.executor.id === client.user.id) return
            if (audit.createdAt - 100 >= new Date().getTime()) {
                type = "kick"
            }
        }
        let data
        if (type == "kick") {
            try { await client.database.history.create("kick", member.guild.id, member.user, audit.executor, audit.reason) } catch {}
            data = {
                meta: {
                    type: 'memberKick',
                    displayName: 'Member Kicked',
                    calculateType: 'guildMemberPunish',
                    color: NucleusColors.red,
                    emoji: "PUNISH.KICK.RED",
                    timestamp: new Date().getTime()
                },
                list: {
                    id: entry(member.id, `\`${member.id}\``),
                    name: entry(member.id, renderUser(member.user)),
                    joined: entry(member.joinedAt, renderDelta(member.joinedAt)),
                    kicked: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    kickedBy: entry(audit.executor.id, renderUser(audit.executor)),
                    reason: entry(audit.reason, audit.reason ? `\n> ${audit.reason}` : "*No reason provided.*"),
                    timeInServer: entry(new Date().getTime() - member.joinedAt, humanizeDuration(new Date().getTime() - member.joinedAt, { round: true })),
                    accountCreated: entry(member.user.createdAt, renderDelta(member.user.createdAt)),
                    serverMemberCount: member.guild.memberCount,
                },
                hidden: {
                    guild: member.guild.id
                }
            }
        } else {
            try { await client.database.history.create("leave", member.guild.id, member.user, null, null) } catch {}
            data = {
                meta: {
                    type: 'memberLeave',
                    displayName: 'Member Left',
                    calculateType: 'guildMemberUpdate',
                    color: NucleusColors.red,
                    emoji: "MEMBER." + (member.bot ? "BOT." : "") + "LEAVE",
                    timestamp: new Date().getTime()
                },
                list: {
                    id: entry(member.id, `\`${member.id}\``),
                    name: entry(member.id, renderUser(member.user)),
                    joined: entry(member.joinedTimestamp, renderDelta(member.joinedAt)),
                    left: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    timeInServer: entry(new Date().getTime() - member.joinedTimestamp, humanizeDuration(new Date().getTime() - member.joinedAt, { round: true })),
                    accountCreated: entry(member.user.createdAt, renderDelta(member.user.createdAt)),
                    serverMemberCount: member.guild.memberCount,
                },
                hidden: {
                    guild: member.guild.id
                }
            }
        }
        log(data);
    } catch (e) { console.log(e) }
}
