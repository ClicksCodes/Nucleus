import type { NucleusClient } from "../utils/client.js";
import { AttachmentBuilder, Message, MessageReference } from "discord.js";
import type Discord from "discord.js";
import * as diff from "diff";

export const event = "messageUpdate";

export async function callback(client: NucleusClient, oldMessage: Message, newMessage: Message) {
    if (newMessage.author.id === client.user!.id) return;
    if (newMessage.author.bot) return;
    if (!newMessage.guild) return;
    const { log, isLogging, NucleusColors, entry, renderUser, renderDelta, renderNumberDelta, renderChannel } =
        client.logger;
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
    const green = "\x1B[36m";
    const red = "\x1B[41m";
    const skipped = "\x1B[40;33m";
    const reset = "\x1B[0m";
    const bold = "\x1B[1m";
    // console.log(differences);
    // let contentAdd = "";
    // let contentRemove = "";
    // if (differences.map((d) => (d.added || d.removed ? 1 : 0)).filter((f) => f === 1).length > 0) {
    //     const cutoff = 20;
    //     differences.forEach((part) => {
    //         if (!part.added && !part.removed && part.value.length > cutoff) {
    //             contentAdd +=
    //                 reset +
    //                 part.value.slice(0, cutoff / 2) +
    //                 skipped +
    //                 `(${part.value.length - cutoff} more)` +
    //                 reset +
    //                 part.value.slice(-(cutoff / 2));
    //             contentRemove +=
    //                 reset +
    //                 part.value.slice(0, cutoff / 2) +
    //                 skipped +
    //                 `(${part.value.length - cutoff} more)` +
    //                 reset +
    //                 part.value.slice(-(cutoff / 2));
    //         } else {
    //             if (part.added || part.removed) {
    //                 part.value = part.value.replaceAll(" ", "▁");
    //             }
    //             if (part.added) {
    //                 contentAdd += green + part.value + reset;
    //             } else if (part.removed) {
    //                 contentRemove += red + part.value + reset;
    //             } else {
    //                 contentAdd += part.value;
    //                 contentRemove += part.value;
    //             }
    //         }
    //     });
    const key = `\n\n${bold}Key:${reset} ${green}Added${reset} | ${red}Removed${reset} | ${skipped}Skipped${reset}`;
    const data = {
        meta: {
            type: "messageUpdate",
            displayName: "Message Edited",
            calculateType: "messageUpdate",
            color: NucleusColors.yellow,
            emoji: "MESSAGE.EDIT",
            timestamp: newMessage.editedTimestamp,
            files: [
                new AttachmentBuilder(Buffer.from(JSON.stringify(differences), 'base64'), {
                    name: "diff.json",
                    description: "A JSON file containing the differences between the two messages."
                })
            ],
            showDetails: true
        },
        separate: {
            start: `To read the full log press the button below.\n\`\`\`ansi\n${key}\`\`\``,
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
