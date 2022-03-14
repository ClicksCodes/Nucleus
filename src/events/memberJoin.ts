import { callback as statsChannelAdd } from '../automations/statsChannelAdd.js';
import { callback as welcome } from '../automations/welcome.js';
import log from '../utils/log.js';
export const event = 'guildMemberAdd'

export async function callback(_, member) {
    try { welcome(_, member); } catch {}
    try { statsChannelAdd(_, member); } catch {}
    try {
        const { log, NucleusColors, entry, renderUser, renderDelta } = member.client.logger
        let data = {
            meta: {
                type: 'memberJoin',
                displayName: 'Member Joined',
                calculateType: 'guildMemberUpdate',
                color: NucleusColors.green,
                emoji: "MEMBER" + (member.user.bot ? ".BOT" : "") + ".JOIN",
                timestamp: member.joinedTimestamp
            },
            list: {
                id: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedAt, renderDelta(member.joinedAt)),
                accountCreated: entry(member.user.createdAt, renderDelta(member.user.createdAt)),
                serverMemberCount: member.guild.memberCount,
            },
            hidden: {
                guild: member.guild.id
            }
        }
        log(data, member.client);
    } catch {}
}
