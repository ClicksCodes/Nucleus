// @ts-expect-error
import type { HaikuClient } from "jshaiku";
import type { Message, MessageReference } from "discord.js";

export const event = "messageUpdate";

export async function callback(client: HaikuClient, oldMessage: Message, newMessage: Message) {
    if (newMessage.author.id === client.user.id) return;
    if (!newMessage.guild) return;
    const { log, NucleusColors, entry, renderUser, renderDelta, renderNumberDelta, renderChannel } = client.logger;
    const replyTo: MessageReference | null = newMessage.reference;
    let newContent = newMessage.cleanContent.replaceAll("`", "‘");
    let oldContent = oldMessage.cleanContent.replaceAll("`", "‘");
    let attachmentJump = "";
    const config = (await client.database.guilds.read(newMessage.guild.id)).logging.attachments.saved[
        newMessage.channel.id + newMessage.id
    ];
    if (config) {
        attachmentJump = ` [[View attachments]](${config})`;
    }
    if (newContent === oldContent) {
        if (!oldMessage.flags.has("CROSSPOSTED") && newMessage.flags.has("CROSSPOSTED")) {
            const data = {
                meta: {
                    type: "messageAnnounce",
                    displayName: "Message Published",
                    calculateType: "messageAnnounce",
                    color: NucleusColors.yellow,
                    emoji: "MESSAGE.CREATE",
                    timestamp: newMessage.editedTimestamp
                },
                separate: {
                    end: `[[Jump to message]](${newMessage.url})`
                },
                list: {
                    messageId: entry(newMessage.id, `\`${newMessage.id}\``),
                    sentBy: entry(newMessage.author.id, renderUser(newMessage.author)),
                    sentIn: entry(newMessage.channel.id, renderChannel(newMessage.channel)),
                    sent: entry(
                        new Date(newMessage.createdTimestamp),
                        renderDelta(new Date(newMessage.createdTimestamp))
                    ),
                    published: entry(
                        new Date(newMessage.editedTimestamp!),
                        renderDelta(new Date(newMessage.editedTimestamp!))
                    ),
                    mentions: renderNumberDelta(oldMessage.mentions.users.size, newMessage.mentions.users.size),
                    attachments: entry(
                        renderNumberDelta(oldMessage.attachments.size, newMessage.attachments.size),
                        renderNumberDelta(oldMessage.attachments.size, newMessage.attachments.size) + attachmentJump
                    )
                },
                hidden: {
                    guild: newMessage.guild.id
                }
            };
            return log(data);
        }
    }
    if (!newMessage.editedTimestamp) {
        return;
    }
    if (newContent.length > 256) newContent = newContent.substring(0, 253) + "...";
    if (oldContent.length > 256) oldContent = oldContent.substring(0, 253) + "...";
    const data = {
        meta: {
            type: "messageUpdate",
            displayName: "Message Edited",
            calculateType: "messageUpdate",
            color: NucleusColors.yellow,
            emoji: "MESSAGE.EDIT",
            timestamp: newMessage.editedTimestamp
        },
        separate: {
            start:
                (oldContent
                    ? `**Before:**\n\`\`\`\n${oldContent}\n\`\`\`\n`
                    : "**Before:** *Message had no content*\n") +
                (newContent ? `**After:**\n\`\`\`\n${newContent}\n\`\`\`` : "**After:** *Message had no content*"),
            end: `[[Jump to message]](${newMessage.url})`
        },
        list: {
            messageId: entry(newMessage.id, `\`${newMessage.id}\``),
            sentBy: entry(newMessage.author.id, renderUser(newMessage.author)),
            sentIn: entry(newMessage.channel.id, renderChannel(newMessage.channel)),
            sent: entry(new Date(newMessage.createdTimestamp), renderDelta(new Date(newMessage.createdTimestamp))),
            edited: entry(new Date(newMessage.editedTimestamp), renderDelta(new Date(newMessage.editedTimestamp))),
            mentions: renderNumberDelta(oldMessage.mentions.users.size, newMessage.mentions.users.size),
            attachments: entry(
                renderNumberDelta(oldMessage.attachments.size, newMessage.attachments.size),
                renderNumberDelta(oldMessage.attachments.size, newMessage.attachments.size) + attachmentJump
            ),
            repliedTo: entry(
                replyTo,
                replyTo
                    ? `[[Jump to message]](https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${replyTo.messageId})`
                    : "None"
            )
        },
        hidden: {
            guild: newMessage.guild.id
        }
    };
    log(data);
}