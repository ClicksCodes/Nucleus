import humanizeDuration from 'humanize-duration';
import { callback as statsChannelRemove } from '../automations/statsChannelRemove.js';

export const event = 'guildMemberRemove'

export async function callback(_, member) {
    try { await statsChannelRemove(_, member); } catch {}
    try {
        const { log, NucleusColors, entry, renderUser, renderDelta } = member.client.logger
        let data = {
            meta: {
                type: 'memberLeave',
                displayName: 'Member Left',
                calculateType: 'guildMemberUpdate',
                color: NucleusColors.red,
                emoji: "MEMBER" + (member.user.bot ? ".BOT" : "") + ".LEAVE",
                timestamp: new Date().getTime()
            },
            list: {
                id: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: entry(member.joinedAt, renderDelta(member.joinedAt)),
                left: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                timeInServer: entry(new Date().getTime() - member.joinedAt, humanizeDuration(new Date().getTime() - member.joinedAt, { round: true })),
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
