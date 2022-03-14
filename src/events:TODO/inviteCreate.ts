const {addLog} = require('../scripts/addLogs');

module.exports = {
    name:'inviteCreate',
    once:false,
    async execute(invite) {

        const i = await invite.guild.invites.fetch(invite.code)

        let data = {
            channel: invite.channel.id,
            code: invite.code,
            createdAt: invite.createdTimestamp,
            expiresAt: invite.expiresTimestamp,
            createdBy: invite.inviter.id,
            maxUsage: i.maxUses,
            maxAge: i.maxAge
        }

        addLog(invite.guild.id, data)
    }
}