import type { NucleusClient } from "../utils/client.js";
import { LinkCheck, MalwareCheck, NSFWCheck, SizeCheck, TestString, TestImage } from "../reflex/scanners.js";
import logAttachment from "../premium/attachmentLogs.js";
import { messageException } from "../utils/createTemporaryStorage.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";
import { callback as statsChannelUpdate } from "../reflex/statsChannelUpdate.js";
import { ChannelType, Message, ThreadChannel } from "discord.js";

export const event = "messageCreate";

export async function callback(_client: NucleusClient, message: Message) {
    if (!message.guild) return;
    const config = await client.memory.readGuildInfo(message.guild.id);

    if (config.autoPublish.enabled 
        && config.autoPublish.channels.includes(message.channel.id)
        && message.channel.type === ChannelType.GuildAnnouncement
        && message.reference === null
    ) {
        await message.crosspost();
    }

    if (message.author.bot) return;
    if (message.channel.isDMBased()) return;
    try {
        await statsChannelUpdate(client, await message.guild.members.fetch(message.author.id));
    } catch (e) {
        console.log(e);
    }

    const { log, isLogging, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;

    const fileNames = await logAttachment(message);

    const content = message.content.toLowerCase() || "";
    if(config.filters.clean.channels.includes(message.channel.id)) {
        const memberRoles = message.member!.roles.cache.map(role => role.id);
        const roleAllow = config.filters.clean.allowed.roles.some(role => memberRoles.includes(role));
        const userAllow = config.filters.clean.allowed.users.includes(message.author.id);
        if(!roleAllow && !userAllow) return await message.delete();
    }

    const filter = getEmojiByName("ICONS.FILTER");
    let attachmentJump = "";
    if (config.logging.attachments.saved[message.channel.id + message.id]) {
        attachmentJump = ` [[View attachments]](${config.logging.attachments.saved[message.channel.id + message.id]})`;
    }
    const list = {
        messageId: entry(message.id, `\`${message.id}\``),
        sentBy: entry(message.author.id, renderUser(message.author)),
        sentIn: entry(message.channel.id, renderChannel(message.channel)),
        deleted: entry(Date.now(), renderDelta(Date.now())),
        mentions: message.mentions.users.size,
        attachments: entry(message.attachments.size, message.attachments.size + attachmentJump),
        repliedTo: entry(
            (message.reference ? message.reference.messageId : null) ?? null,
            message.reference
                ? `[[Jump to message]](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.reference.messageId})`
                : "None"
        )
    };

    if (config.filters.invite.enabled) {
        if (!config.filters.invite.allowed.channels.includes(message.channel.id)) {
            if (/(?:https?:\/\/)?discord(?:app)?\.(?:com\/invite|gg)\/[a-zA-Z0-9]+\/?/.test(content)) {
                messageException(message.guild.id, message.channel.id, message.id);
                message.delete();
                const data = {
                    meta: {
                        type: "messageDelete",
                        displayName: "Message Deleted (Automated, Contained Invite)",
                        calculateType: "autoModeratorDeleted",
                        color: NucleusColors.red,
                        emoji: "MESSAGE.DELETE",
                        timestamp: Date.now()
                    },
                    separate: {
                        start:
                            filter +
                            " Contained invite\n\n" +
                            (content ? `**Message:**\n\`\`\`${content}\`\`\`` : "**Message:** *Message had no content*")
                    },
                    list: list,
                    hidden: {
                        guild: message.channel.guild.id
                    }
                };
                return log(data);
            }
        }
    }

    if (fileNames.files.length > 0) {
        for (const element of fileNames.files) {
            const url = element.url ? element.url : element.local;
            if (/\.(j(pe?g|fif)|a?png|gifv?|w(eb[mp]|av)|mp([34]|eg-\d)|ogg|avi|h\.26(4|5)|cda)$/.test(url.toLowerCase())) {
                // jpg|jpeg|png|apng|gif|gifv|webm|webp|mp4|wav|mp3|ogg|jfif|MPEG-#|avi|h.264|h.265
                if (
                    config.filters.images.NSFW &&
                    !(message.channel instanceof ThreadChannel ? message.channel.parent?.nsfw : message.channel.nsfw)
                ) {
                    if (await NSFWCheck(url)) {
                        messageException(message.guild.id, message.channel.id, message.id);
                        await message.delete();
                        const data = {
                            meta: {
                                type: "messageDelete",
                                displayName: "Message Deleted",
                                calculateType: "autoModeratorDeleted",
                                color: NucleusColors.red,
                                emoji: "MESSAGE.DELETE",
                                timestamp: Date.now()
                            },
                            separate: {
                                start:
                                    filter +
                                    " Image detected as NSFW\n\n" +
                                    (content
                                        ? `**Message:**\n\`\`\`${content}\`\`\``
                                        : "**Message:** *Message had no content*")
                            },
                            list: list,
                            hidden: {
                                guild: message.channel.guild.id
                            }
                        };
                        return log(data);
                    }
                }
                if (config.filters.wordFilter.enabled) {
                    const text = await TestImage(url);
                    const check = TestString(
                        text ?? "",
                        config.filters.wordFilter.words.loose,
                        config.filters.wordFilter.words.strict
                    );
                    if (check !== null) {
                        messageException(message.guild.id, message.channel.id, message.id);
                        await message.delete();
                        const data = {
                            meta: {
                                type: "messageDelete",
                                displayName: "Message Deleted",
                                calculateType: "autoModeratorDeleted",
                                color: NucleusColors.red,
                                emoji: "MESSAGE.DELETE",
                                timestamp: Date.now()
                            },
                            separate: {
                                start:
                                    filter +
                                    " Image contained filtered word\n\n" +
                                    (content
                                        ? `**Message:**\n\`\`\`${content}\`\`\``
                                        : "**Message:** *Message had no content*")
                            },
                            list: list,
                            hidden: {
                                guild: message.channel.guild.id
                            }
                        };
                        return log(data);
                    }
                }
                if (config.filters.images.size) {
                    if (url.match(/\.+(webp|png|jpg)$/gi)) {
                        if (!(await SizeCheck(element))) {
                            messageException(message.guild.id, message.channel.id, message.id);
                            await message.delete();
                            const data = {
                                meta: {
                                    type: "messageDelete",
                                    displayName: "Message Deleted",
                                    calculateType: "autoModeratorDeleted",
                                    color: NucleusColors.red,
                                    emoji: "MESSAGE.DELETE",
                                    timestamp: Date.now()
                                },
                                separate: {
                                    start:
                                        filter +
                                        " Image was too small\n\n" +
                                        (content
                                            ? `**Message:**\n\`\`\`${content}\`\`\``
                                            : "**Message:** *Message had no content*")
                                },
                                list: list,
                                hidden: {
                                    guild: message.channel.guild.id
                                }
                            };
                            return log(data);
                        }
                    }
                }
            }
            if (config.filters.malware) {
                if (!(await MalwareCheck(url))) {
                    messageException(message.guild.id, message.channel.id, message.id);
                    await message.delete();
                    const data = {
                        meta: {
                            type: "messageDelete",
                            displayName: "Message Deleted",
                            calculateType: "autoModeratorDeleted",
                            color: NucleusColors.red,
                            emoji: "MESSAGE.DELETE",
                            timestamp: Date.now()
                        },
                        separate: {
                            start:
                                filter +
                                " File detected as malware\n\n" +
                                (content
                                    ? `**Message:**\n\`\`\`${content}\`\`\``
                                    : "**Message:** *Message had no content*")
                        },
                        list: list,
                        hidden: {
                            guild: message.channel.guild.id
                        }
                    };
                    return log(data);
                }
            }
        }
    }

    const linkDetectionTypes = await LinkCheck(message);
    if (linkDetectionTypes.length > 0) {
        messageException(message.guild.id, message.channel.id, message.id);
        await message.delete();
        const data = {
            meta: {
                type: "messageDelete",
                displayName: "Message Deleted",
                calculateType: "autoModeratorDeleted",
                color: NucleusColors.red,
                emoji: "MESSAGE.DELETE",
                timestamp: Date.now()
            },
            separate: {
                start:
                    filter +
                    ` Link filtered as ${linkDetectionTypes[0]?.toLowerCase()}\n\n` +
                    (content ? `**Message:**\n\`\`\`${content}\`\`\`` : "**Message:** *Message had no content*")
            },
            list: list,
            hidden: {
                guild: message.channel.guild.id
            }
        };
        return log(data);
    }

    if (config.filters.wordFilter.enabled) {
        const check = TestString(
            content,
            config.filters.wordFilter.words.loose,
            config.filters.wordFilter.words.strict
        );
        if (check !== null) {
            messageException(message.guild.id, message.channel.id, message.id);
            await message.delete();
            const data = {
                meta: {
                    type: "messageDelete",
                    displayName: "Message Deleted",
                    calculateType: "autoModeratorDeleted",
                    color: NucleusColors.red,
                    emoji: "MESSAGE.DELETE",
                    timestamp: Date.now()
                },
                separate: {
                    start:
                        filter +
                        " Message contained filtered word\n\n" +
                        (content ? `**Message:**\n\`\`\`${content}\`\`\`` : "**Message:** *Message had no content*")
                },
                list: list,
                hidden: {
                    guild: message.channel.guild.id
                }
            };
            return log(data);
        }
    }

    if (config.filters.pings.everyone && message.mentions.everyone) {
        if(!await isLogging(message.guild.id, "messageMassPing")) return;
        const data = {
            meta: {
                type: "everyonePing",
                displayName: "Everyone Pinged",
                calculateType: "messageMassPing",
                color: NucleusColors.yellow,
                emoji: "MESSAGE.PING.EVERYONE",
                timestamp: Date.now()
            },
            separate: {
                start: content ? `**Message:**\n\`\`\`${content}\`\`\`` : "**Message:** *Message had no content*"
            },
            list: list,
            hidden: {
                guild: message.channel.guild.id
            }
        };
        return log(data);
    }
    if (config.filters.pings.roles) {
        for (const roleId in message.mentions.roles) {
            if (!config.filters.pings.allowed.roles.includes(roleId)) {
                messageException(message.guild.id, message.channel.id, message.id);
                await message.delete();
                if(!await isLogging(message.guild.id, "messageMassPing")) return;
                const data = {
                    meta: {
                        type: "rolePing",
                        displayName: "Role Pinged",
                        calculateType: "messageMassPing",
                        color: NucleusColors.yellow,
                        emoji: "MESSAGE.PING.ROLE",
                        timestamp: Date.now()
                    },
                    separate: {
                        start: content
                            ? `**Message:**\n\`\`\`${content}\`\`\``
                            : "**Message:** *Message had no content*"
                    },
                    list: list,
                    hidden: {
                        guild: message.channel.guild.id
                    }
                };
                return log(data);
            }
        }
    }
    if (message.mentions.users.size >= config.filters.pings.mass && config.filters.pings.mass) {
        messageException(message.guild.id, message.channel.id, message.id);
        await message.delete();
        if(!await isLogging(message.guild.id, "messageMassPing")) return;
        const data = {
            meta: {
                type: "massPing",
                displayName: "Mass Ping",
                calculateType: "messageMassPing",
                color: NucleusColors.yellow,
                emoji: "MESSAGE.PING.MASS",
                timestamp: Date.now()
            },
            separate: {
                start: content ? `**Message:**\n\`\`\`${content}\`\`\`` : "**Message:** *Message had no content*"
            },
            list: list,
            hidden: {
                guild: message.channel.guild.id
            }
        };
        return log(data);
    }
}
