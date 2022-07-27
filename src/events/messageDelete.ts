export const event = 'messageDelete'

export async function callback(client, message) {
    try {
        if (message.author.id === client.user.id) return;
        if (client.noLog.includes(`${message.guild.id}/${message.channel.id}/${message.id}`)) return;
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = message.channel.client.logger
        let auditLog = await getAuditLog(message.guild, 'MEMBER_BAN_ADD')
        let audit = auditLog.entries.filter(entry => entry.target.id === message.author.id).first();
        if (audit) {
            if (audit.createdAt - 100 < new Date().getTime()) return;
        }
        message.reference = message.reference || {}
        let content = message.cleanContent
        content.replace(`\``, `\\\``)
        if (content.length > 256) content = content.substring(0, 253) + '...'
        let attachments = message.attachments.size + (message.content.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi) ?? []).length
        let attachmentJump = ""
        let config = (await client.database.guilds.read(message.guild.id)).logging.attachments.saved[message.channel.id + message.id];
        if (config) { attachmentJump = ` [[View attachments]](${config})` }
        let data = {
            meta: {
                type: 'messageDelete',
                displayName: 'Message Deleted',
                calculateType: 'messageDelete',
                color: NucleusColors.red,
                emoji: 'MESSAGE.DELETE',
                timestamp: new Date().getTime()
            },
            separate: {
                start: content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*',
            },
            list: {
                messageId: entry(message.id, `\`${message.id}\``),
                sentBy: entry(message.author.id, renderUser(message.author)),
                sentIn: entry(message.channel.id, renderChannel(message.channel)),
                deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                mentions: message.mentions.users.size,
                attachments: entry(attachments, attachments + attachmentJump),
                repliedTo: entry(
                    message.reference.messageId || null,
                    message.reference.messageId ? `[[Jump to message]](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.reference.messageId})` : "None"
                )
            },
            hidden: {
                guild: message.channel.guild.id
            }
        }
        log(data);
    } catch(e) { console.log(e) }
}
