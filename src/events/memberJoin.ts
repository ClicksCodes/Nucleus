import { callback as statsChannelAdd } from '../reflex/statsChannelUpdate.js';
import { callback as welcome } from '../reflex/welcome.js';
import log from '../utils/log.js';
import client from '../utils/client.js';

export const event = 'guildMemberAdd'

export async function callback(_, member) {
    try { welcome(_, member); } catch {}
    try {
        const { log, NucleusColors, entry, renderUser, renderDelta } = member.client.logger
        try { await client.database.history.create("join", member.guild.id, member.user, null, null) } catch {}
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
                memberId: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedAt, renderDelta(member.joinedAt)),
                accountCreated: entry(member.user.createdAt, renderDelta(member.user.createdAt)),
                serverMemberCount: member.guild.memberCount,
            },
            hidden: {
                guild: member.guild.id
            }
        }
        log(data);
    } catch {}
    try { statsChannelAdd(_, member, ); } catch {}
}
