export const event = 'messageDelete'

export async function callback(client, message) {
    if (message.author.id == client.user.id) return;
	const { log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = message.channel.client.logger
    message.reference = message.reference || {}
    let content = message.cleanContent
    if (content.length > 256) content = content.substring(0, 253) + '...'
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
            id: entry(message.id, `\`${message.id}\``),
            sentBy: entry(message.author.id, renderUser(message.author)),
            sentIn: entry(message.channel.id, renderChannel(message.channel)),
            deleted: entry(new Date(message.createdTimestamp), renderDelta(new Date(message.createdTimestamp))),
            mentions: message.mentions.users.size,
            attachments: message.attachments.size,
            repliedTo: entry(
                message.reference.messageId || null,
                message.reference.messageId ? `[[Jump to message]](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.reference.messageId})` : "None"
            )
        },
        hidden: {
            guild: message.channel.guild.id
        }
    }
    log(data, client);
}
