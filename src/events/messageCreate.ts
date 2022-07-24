import { LinkCheck, MalwareCheck, NSFWCheck, SizeCheck, TestString, TestImage } from '../reflex/scanners.js'
import logAttachment from '../premium/attachmentLogs.js'
import createLogException from '../utils/createLogException.js'
import getEmojiByName from '../utils/getEmojiByName.js'

export const event = 'messageCreate'

export async function callback(client, message) {
    if(!message) return;
    if (message.author.bot) return
    if (message.channel.type === 'dm') return

    const { log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger

    let fileNames = await logAttachment(message);

    let content = message.content.toLowerCase() || ''
    let config = await client.memory.readGuildInfo(message.guild.id);
    const filter = getEmojiByName("ICONS.FILTER")
    let attachmentJump = ""
    if (config.logging.attachments.saved[message.channel.id + message.id]) { attachmentJump = ` [[View attachments]](${config.logging.attachments.saved[message.channel.id + message.id]})` }
    let list = {
        messageId: entry(message.id, `\`${message.id}\``),
        sentBy: entry(message.author.id, renderUser(message.author)),
        sentIn: entry(message.channel.id, renderChannel(message.channel)),
        deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
        mentions: message.mentions.users.size,
        attachments: entry(message.attachments.size, message.attachments.size + attachmentJump),
        repliedTo: entry(
            message.reference ? message.reference.messageId : null,
            message.reference ? `[[Jump to message]](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.reference.messageId})` : "None"
        )
    }

    if (config.filters.invite.enabled) {
        if (!config.filters.invite.allowed.users.includes(message.author.id) ||
            !config.filters.invite.allowed.channels.includes(message.channel.id) ||
            !message.author.roles.cache.some(role => config.filters.invite.allowed.roles.includes(role.id))
        ) {
            if ((/(?:https?:\/\/)?discord(?:app)?\.(?:com\/invite|gg)\/[a-zA-Z0-9]+\/?/.test(content))) {
                createLogException(message.guild.id, message.channel.id, message.id)
                message.delete();
                let data = {
                    meta: {
                        type: 'messageDelete',
                        displayName: 'Message Deleted (Automated, Contained Invite)',
                        calculateType: 'autoModeratorDeleted',
                        color: NucleusColors.red,
                        emoji: 'MESSAGE.DELETE',
                        timestamp: new Date().getTime()
                    },
                    separate: {
                        start: filter + " Contained invite\n\n" + (content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*'),
                    },
                    list: list,
                    hidden: {
                        guild: message.channel.guild.id
                    }
                }
                return log(data);
            }
        }
    }

    if (fileNames.files.length > 0) {
        for (let element of fileNames.files) {
            if(!message) return;
            let url = element.url ? element.url : element.local
            if (url != undefined) {
                if(/\.(jpg|jpeg|png|gif|gifv|webm|webp|mp4|wav|mp3|ogg)$/.test(url)) {
                    if (config.filters.images.NSFW && !message.channel.nsfw) {
                        if (await NSFWCheck(url)) {
                            createLogException(message.guild.id, message.channel.id, message.id)
                            await message.delete()
                            let data = {
                                meta: {
                                    type: 'messageDelete',
                                    displayName: 'Message Deleted',
                                    calculateType: 'autoModeratorDeleted',
                                    color: NucleusColors.red,
                                    emoji: 'MESSAGE.DELETE',
                                    timestamp: new Date().getTime()
                                },
                                separate: {
                                    start: filter + " Image detected as NSFW\n\n" + (content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*'),
                                },
                                list: list,
                                hidden: {
                                    guild: message.channel.guild.id
                                }
                            }
                            return log(data);
                        }
                    }
                    if (config.filters.wordFilter.enabled) {
                        let text = await TestImage(url)
                        if (config.filters.wordFilter.enabled) {
                            let check = TestString(text, config.filters.wordFilter.words.loose, config.filters.wordFilter.words.strict)
                            if(check !== null) {
                                createLogException(message.guild.id, message.channel.id, message.id)
                                await message.delete()
                                let data = {
                                    meta: {
                                        type: 'messageDelete',
                                        displayName: 'Message Deleted',
                                        calculateType: 'autoModeratorDeleted',
                                        color: NucleusColors.red,
                                        emoji: 'MESSAGE.DELETE',
                                        timestamp: new Date().getTime()
                                    },
                                    separate: {
                                        start: filter + " Image contained filtered word\n\n" + (content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*'),
                                    },
                                    list: list,
                                    hidden: {
                                        guild: message.channel.guild.id
                                    }
                                }
                                return log(data);
                            }
                        }
                    }
                    if (config.filters.images.size) {
                        if(url.match(/\.+(webp|png|jpg)$/gi)) {
                            if(!await SizeCheck(element)) {
                                createLogException(message.guild.id, message.channel.id, message.id)
                                await message.delete()
                                let data = {
                                    meta: {
                                        type: 'messageDelete',
                                        displayName: 'Message Deleted',
                                        calculateType: 'autoModeratorDeleted',
                                        color: NucleusColors.red,
                                        emoji: 'MESSAGE.DELETE',
                                        timestamp: new Date().getTime()
                                    },
                                    separate: {
                                        start: filter + " Image was too small\n\n" + (content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*'),
                                    },
                                    list: list,
                                    hidden: {
                                        guild: message.channel.guild.id
                                    }
                                }
                                return log(data);
                            }
                        }
                    }
                }
                if (config.filters.malware) {
                    if (!MalwareCheck(url)) {
                        createLogException(message.guild.id, message.channel.id, message.id)
                        await message.delete()
                        let data = {
                            meta: {
                                type: 'messageDelete',
                                displayName: 'Message Deleted',
                                calculateType: 'autoModeratorDeleted',
                                color: NucleusColors.red,
                                emoji: 'MESSAGE.DELETE',
                                timestamp: new Date().getTime()
                            },
                            separate: {
                                start: filter + " File detected as malware\n\n" + (content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*'),
                            },
                            list: list,
                            hidden: {
                                guild: message.channel.guild.id
                            }
                        }
                        return log(data);
                    }
                }
            }
        };
    }
    if(!message) return;

    let linkDetectionTypes = await LinkCheck(message)
    if (linkDetectionTypes.length > 0) {
        createLogException(message.guild.id, message.channel.id, message.id)
        await message.delete()
        let data = {
            meta: {
                type: 'messageDelete',
                displayName: `Message Deleted`,
                calculateType: 'autoModeratorDeleted',
                color: NucleusColors.red,
                emoji: 'MESSAGE.DELETE',
                timestamp: new Date().getTime()
            },
            separate: {
                start: filter + ` Link filtered as ${linkDetectionTypes[0].toLowerCase()}\n\n` + (content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*'),
            },
            list: list,
            hidden: {
                guild: message.channel.guild.id
            }
        }
        return log(data);
    }
    if (config.filters.wordFilter.enabled) {
        let check = TestString(content, config.filters.wordFilter.words.loose, config.filters.wordFilter.words.strict)
        if(check !== null) {
            createLogException(message.guild.id, message.channel.id, message.id)
            await message.delete()
            let data = {
                meta: {
                    type: 'messageDelete',
                    displayName: 'Message Deleted',
                    calculateType: 'autoModeratorDeleted',
                    color: NucleusColors.red,
                    emoji: 'MESSAGE.DELETE',
                    timestamp: new Date().getTime()
                },
                separate: {
                    start: filter + ` Message contained filtered word\n\n` + (content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*'),
                },
                list: list,
                hidden: {
                    guild: message.channel.guild.id
                }
            }
            return log(data);
        }
    }

    if (!config.filters.pings.allowed.users.includes(message.author.id) ||
        !config.filters.pings.allowed.channels.includes(message.channel.id) ||
        !message.author.roles.cache.some(role => config.filters.pings.allowed.roles.includes(role.id))
    ) {
        if (config.filters.pings.everyone && message.mentions.everyone) {
            let data = {
                meta: {
                    type: 'everyonePing',
                    displayName: 'Everyone Pinged',
                    calculateType: 'messageMassPing',
                    color: NucleusColors.yellow,
                    emoji: 'MESSAGE.PING.EVERYONE',
                    timestamp: new Date().getTime()
                },
                separate: {
                    start: content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*',
                },
                list: list,
                hidden: {
                    guild: message.channel.guild.id
                }
            }
            return log(data);
        }
        if (config.filters.pings.roles) {
            for(let role of message.mentions.roles) {
                if(!message) return;
                if (!config.filters.pings.allowed.roles.includes(role.id)) {
                    createLogException(message.guild.id, message.channel.id, message.id)
                    await message.delete()
                    let data = {
                        meta: {
                            type: 'rolePing',
                            displayName: 'Role Pinged',
                            calculateType: 'messageMassPing',
                            color: NucleusColors.yellow,
                            emoji: 'MESSAGE.PING.ROLE',
                            timestamp: new Date().getTime()
                        },
                        separate: {
                            start: content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*',
                        },
                        list: list,
                        hidden: {
                            guild: message.channel.guild.id
                        }
                    }
                    return log(data);
                }
            }
        }
        if (message.mentions.users.size >= config.filters.pings.mass && config.filters.pings.mass) {
            createLogException(message.guild.id, message.channel.id, message.id)
            await message.delete()
            let data = {
                meta: {
                    type: 'massPing',
                    displayName: `Mass Ping`,
                    calculateType: 'messageMassPing',
                    color: NucleusColors.yellow,
                    emoji: 'MESSAGE.PING.MASS',
                    timestamp: new Date().getTime()
                },
                separate: {
                    start: content ? `**Message:**\n\`\`\`${content}\`\`\`` : '**Message:** *Message had no content*',
                },
                list: list,
                hidden: {
                    guild: message.channel.guild.id
                }
            }
            return log(data);
        }
    }
}
