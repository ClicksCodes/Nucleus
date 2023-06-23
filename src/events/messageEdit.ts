import type { NucleusClient } from "../utils/client.js";
import { Message, MessageReference, ButtonStyle } from "discord.js";
import type Discord from "discord.js";
import * as diff from "diff";
import addPlural from "../utils/plurals.js";

export const event = "messageUpdate";

export async function callback(client: NucleusClient, oldMessage: Message, newMessage: Message) {
    if (newMessage.author.id === client.user!.id) return;
    if (newMessage.author.bot) return;
    if (!newMessage.guild) return;
    const {
        log,
        isLogging,
        NucleusColors,
        entry,
        renderUser,
        renderDelta,
        renderNumberDelta,
        renderChannel
    } = client.logger;
    const replyTo: MessageReference | null = newMessage.reference;
    const newContent = newMessage.cleanContent.replaceAll("`", "‘");
    const oldContent = oldMessage.cleanContent.replaceAll("`", "‘");
    let attachmentJump = "";
    const config = (await client.database.guilds.read(newMessage.guild.id)).logging.attachments.saved[
        newMessage.channel.id + newMessage.id
    ];
    if (config) {
        attachmentJump = ` [[View attachments]](${config})`;
    }
    if (newMessage.crosspostable !== oldMessage.crosspostable) {
        if (!(await isLogging(newMessage.guild.id, "messageAnnounce"))) return;
        if (!replyTo) {
            const data = {
                meta: {
                    type: "messageAnnounce",
                    displayName: "Message Published",
                    calculateType: "messageAnnounce",
                    color: NucleusColors.green,
                    emoji: "MESSAGE.CREATE",
                    timestamp: newMessage.editedTimestamp ?? Date.now()
                },
                separate: {
                    end: `[[Jump to message]](${newMessage.url})`
                },
                list: {
                    messageId: entry(newMessage.id, `\`${newMessage.id}\``),
                    sentBy: entry(newMessage.author.id, renderUser(newMessage.author)),
                    sentIn: entry(
                        newMessage.channel.id,
                        renderChannel(newMessage.channel as Discord.GuildBasedChannel)
                    ),
                    sent: entry(newMessage.createdTimestamp, renderDelta(newMessage.createdTimestamp)),
                    published: entry(Date.now(), renderDelta(Date.now())),
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
    if (!(await isLogging(newMessage.guild.id, "messageUpdate"))) return;
    if (!newMessage.editedTimestamp) {
        return;
    }
    const differences = diff.diffChars(oldContent, newContent);
    const charsAdded = (differences.filter((d) => d.added).map((d) => d.count)).reduce((a, b) => a! + b!, 0)!;
    const charsRemoved = (differences.filter((d) => d.removed).map((d) => d.count)).reduce((a, b) => a! + b!, 0)!;
    const imageData = JSON.stringify({data: differences, extra: "The image in this embed contains data about the below log.\n" +
                        "It isn't designed to be read by humans, but you can decode " +
                        "it with any base64 decoder, and then read it as JSON.\n" +
                        "We use base 64 to get around people using virus tests and the file being blocked, and an image to have the embed hidden (files can't be suppressed)\n" +
                        "If you've got to this point and are reading this hidden message, you should come and work with us " +
                        "at https://discord.gg/w35pXdrxKW (Internal development server) and let us know how you got here."}, null, 2)
    const data = {
        meta: {
            type: "messageUpdate",
            displayName: "Message Edited",
            calculateType: "messageUpdate",
            color: NucleusColors.yellow,
            emoji: "MESSAGE.EDIT",
            timestamp: newMessage.editedTimestamp,
            buttons: [{ buttonText: "View Changes", buttonStyle: ButtonStyle.Secondary, buttonId: `log:edit` }],
            imageData: imageData
        },
        separate: {
            start: `${addPlural(charsAdded, "character")} added, ${addPlural(charsRemoved, "character")} removed`,
            end: `[[Jump to message]](${newMessage.url})`
        },
        list: {
            messageId: entry(newMessage.id, `\`${newMessage.id}\``),
            sentBy: entry(newMessage.author.id, renderUser(newMessage.author)),
            sentIn: entry(newMessage.channel.id, renderChannel(newMessage.channel as Discord.GuildBasedChannel)),
            sent: entry(newMessage.createdTimestamp, renderDelta(newMessage.createdTimestamp)),
            edited: entry(newMessage.editedTimestamp, renderDelta(newMessage.editedTimestamp)),
            mentions: renderNumberDelta(oldMessage.mentions.users.size, newMessage.mentions.users.size),
            attachments: entry(
                renderNumberDelta(oldMessage.attachments.size, newMessage.attachments.size),
                renderNumberDelta(oldMessage.attachments.size, newMessage.attachments.size) + attachmentJump
            ),
            repliedTo: entry(
                replyTo ? replyTo.messageId! : null,
                replyTo
                    ? `[[Jump to message]](https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${replyTo.messageId})`
                    : "None"
            )
        },
        hidden: {
            guild: newMessage.guild.id
        }
    };
    await log(data);
}
