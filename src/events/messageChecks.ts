import { LinkCheck, MalwareCheck, NSFWCheck, SizeCheck, TestString } from '../automations/unscan.js'
import readConfig from '../utils/readConfig.js'
import { Message } from 'discord.js'

export const event = 'messageCreate'

export async function callback(_, message) {
	if (message.author.bot) return
	if (message.channel.type === 'dm') return

	let content = message.content.toLowerCase() || ''
	let config = await readConfig(message.guild.id);

	if (config.filters.invite.enabled) {
		if (!config.filters.invite.allowed.users.includes(message.author.id) ||
			!config.filters.invite.allowed.channels.includes(message.channel.id) ||
			!message.author.roles.cache.some(role => config.filters.invite.allowed.roles.includes(role.id))
		) {
			if ((/(?:https?:\/\/)?discord(?:app)?\.(?:com\/invite|gg)\/[a-zA-Z0-9]+\/?/.test(content))) {
				message.delete();
				return toLog(message, 'invite', content.match(/(?:https?:\/\/)?discord(?:app)?\.(?:com\/invite|gg)\/[a-zA-Z0-9]+\/?/))
			}
		}
	}

	let attachments = message.attachments.map(element => element)
	attachments = [...attachments, ...content.match(
		/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
	) ?? []].filter(element => (element.url ? element.url : element))
	if (attachments.length > 0) {
		attachments.forEach(async element => {
			if(!message) return;
			let url = element.url ? element.url : element
			if (url != undefined) {
				if(/\.+(webp|png|jpg|jpeg|bmp)/.test(url)) {
					if (config.filters.images.NSFW && !message.channel.nsfw) {
						if (await NSFWCheck(url)) {
							await message.delete()
							return toLog(message, 'NSFW', url)
						}
					}
					if (config.filters.images.size) {
						if(!url.match(/\.+(webp|png|jpg)$/gi)) return
						if(!await SizeCheck(element)) {
							await message.delete()
							return toLog(message, 'size', url)
						}
					}
				}
				if (config.filters.malware) {
					if (!MalwareCheck(url)) {
						await message.delete()
						return toLog(message, 'malware', url)
					}
				}
			}
		});
	}
	if(!message) return;

	if (await LinkCheck(message)) {
		await message.delete()
		return toLog(message, 'link')
	}

	if (config.filters.wordFilter.enabled) {
		let check = TestString(content, config.filters.wordFilter.words.loose, config.filters.wordFilter.words.strict)
		if(check != "none") {
			await message.delete()
			return toLog(message, 'wordFilter', content)
		}
	}

	if (!config.filters.pings.allowed.users.includes(message.author.id) ||
		!config.filters.pings.allowed.channels.includes(message.channel.id) ||
		!message.author.roles.cache.some(role => config.filters.pings.allowed.roles.includes(role.id))
	) {
		if (config.filters.pings.everyone && message.mentions.everyone) {
			message.delete();
			return toLog(message, 'mention everyone')
		}
		if (config.filters.pings.roles) {
			for(let role of message.mentions.roles) {
				if(!message) return;
				if (!config.filters.pings.allowed.roles.includes(role.id)) {
					message.delete();
					return toLog(message, 'mention role')
				}
			}
		}
		if(!message) return;
		if (message.mentions.users.size >= config.filters.pings.mass && config.filters.pings.mass) {
			message.delete();
			return toLog(message, 'Mass Pings')
		}
	}
}

async function toLog(message: Message, reason: string, data?: any) {
	// log(message.guild.id, {type: reason, data: data})
}
