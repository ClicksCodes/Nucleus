import { LinkCheck, MalwareCheck, NSFWCheck, SizeCheck, TestString, TestImage } from '../automations/unscan.js'
import { Message } from 'discord.js'
import client from '../utils/client.js'

export const event = 'messageCreate'

export async function callback(client, message) {
    const { log, NucleusColors, entry, renderUser } = client.logger
    if (message.author.bot) return
    if (message.channel.type === 'dm') return

    let content = message.content.toLowerCase() || ''
    let config = await client.memory.readGuildInfo(message.guild.id);

    if (config.filters.invite.enabled) {
        if (!config.filters.invite.allowed.users.includes(message.author.id) ||
            !config.filters.invite.allowed.channels.includes(message.channel.id) ||
            !message.author.roles.cache.some(role => config.filters.invite.allowed.roles.includes(role.id))
        ) {
            if ((/(?:https?:\/\/)?discord(?:app)?\.(?:com\/invite|gg)\/[a-zA-Z0-9]+\/?/.test(content))) {
                return message.delete();
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
                            return await message.delete()
                        }
                    }
                    if (config.filters.images.size) {
                        if(!url.match(/\.+(webp|png|jpg)$/gi)) return
                        if(!await SizeCheck(element)) {
                            return await message.delete()
                        }
                    }
                }
                if (config.filters.malware) {
                    if (!MalwareCheck(url)) {
                        return await message.delete()
                    }
                }
            }
        });
    }
    if(!message) return;

    if (await LinkCheck(message)) {
        return await message.delete()
    }

    if (config.filters.wordFilter.enabled) {
        let check = TestString(content, config.filters.wordFilter.words.loose, config.filters.wordFilter.words.strict)
        if(check !== null) {
            return await message.delete()
        }
    }

    if (!config.filters.pings.allowed.users.includes(message.author.id) ||
        !config.filters.pings.allowed.channels.includes(message.channel.id) ||
        !message.author.roles.cache.some(role => config.filters.pings.allowed.roles.includes(role.id))
    ) {
        if (config.filters.pings.everyone && message.mentions.everyone) {
            return message.delete();
        }
        if (config.filters.pings.roles) {
            for(let role of message.mentions.roles) {
                if(!message) return;
                if (!config.filters.pings.allowed.roles.includes(role.id)) {
                    return message.delete();
                }
            }
        }
        if(!message) return;
        if (message.mentions.users.size >= config.filters.pings.mass && config.filters.pings.mass) {
            return message.delete();
        }
    }
}
