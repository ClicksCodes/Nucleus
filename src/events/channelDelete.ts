export const event = 'channelDelete'

export async function callback(client, channel) {
	const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser } = channel.client.logger

	let auditLog = await getAuditLog(channel.guild, 'CHANNEL_DELETE');
	let audit = auditLog.entries.filter(entry => entry.target.id == channel.id).first();
    if (audit.executor.id == client.user.id) return;

	let emoji;
	let readableType;
	let displayName;
	switch (channel.type) {
		case 'GUILD_TEXT': {
			emoji = "CHANNEL.TEXT.DELETE";
			readableType = "Text";
			displayName = "Text Channel"
			break;
		}
		case 'GUILD_VOICE': {
			emoji = "CHANNEL.VOICE.DELETE";
			readableType = "Voice";
			displayName = "Voice Channel"
			break;
		}
		case 'GUILD_CATEGORY': {
			emoji = "CHANNEL.CATEGORY.DELETE";
			readableType = "Category";
			displayName = "Category"
			break;
		}
		default: {
			emoji = "CHANNEL.TEXT.DELETE";
			readableType = "Channel";
			displayName = "Channel"
		}
	}

	let data = {
		meta:{
			type: 'channelDelete',
			displayName: displayName + ' Deleted',
			calculateType: 'channelUpdate',
			color: NucleusColors.red,
			emoji: emoji,
			timestamp: audit.createdTimestamp
		},
		list: { // TODO: Add stuff like nsfw, theres loads missing here
			id: entry(channel.id, `\`${channel.id}\``),
			name: entry(channel.id, `${channel.name}`),
			type: entry(channel.type, readableType),
			category: entry(channel.parent ? channel.parent.id : null, channel.parent ? channel.parent.name : "Uncategorised"),
			created: entry(channel.createdTimestamp, renderDelta(channel.createdTimestamp)),
			deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
			deletedBy: entry(audit.executor.id, renderUser(audit.executor))
		},
		hidden: {
			guild: channel.guild.id
		}
	}
	log(data, channel.client);
}
