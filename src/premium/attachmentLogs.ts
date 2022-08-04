import client from "../utils/client.js";
import keyValueList from "../utils/generateKeyValueList.js";
import singleNotify from "../utils/singleNotify.js";
import { saveAttachment } from "../reflex/scanners.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import addPlural from "../utils/plurals.js";
import type { Message } from "discord.js";


export default async function logAttachment(message: Message): Promise<AttachmentLogSchema> {
    if (!message.guild) throw new Error("Tried to log an attachment in a non-guild message");
    const { renderUser, renderChannel, renderDelta } = client.logger;
    const attachments = [];
    for (const attachment of message.attachments.values()) {
        attachments.push({local: await saveAttachment(attachment.url), url: attachment.url, height: attachment.height, width: attachment.width, size: attachment.size});
    }
    const links = message.content.match(/https?:\/\/\S+/gi) || [];
    for (const link of links) {
        if (link.toLowerCase().match(/\.(jpg|jpeg|png|gif|gifv|webm|webp|mp4|wav|mp3|ogg)$/gi)) {
            attachments.push({local: await saveAttachment(link), url: link, height: null, width: null});
        }
    }
    if (attachments.length === 0) return {files: []};
    if (client.database.premium.hasPremium(message.guild.id)) {
        const channel = (await client.database.guilds.read(message.guild.id)).logging.attachments.channel;
        if (!channel) {
            singleNotify("noAttachmentLogChannel", message.guild.id, "No channel set for attachment logging", "Warning");
            return {files: attachments};
        }
        const channelObj = await client.channels.fetch(channel);
        if (!channelObj) {
            singleNotify("attachmentLogChannelDeleted", message.guild.id, "Attachment history channel was deleted", "Warning");
            return {files: attachments};
        }
        const m = await channelObj.send({embeds: [new EmojiEmbed()
            .setTitle(`${addPlural(attachments.length, "Attachment")} Sent`)
            .setDescription(keyValueList({
                "messageId": `\`${message.id}\``,
                "sentBy": renderUser(message.author),
                "sentIn": renderChannel(message.channel),
                "sent": renderDelta(new Date(message.createdTimestamp))
            }) + `\n[[Jump to message]](${message.url})`)
            .setEmoji("ICONS.ATTACHMENT")
            .setStatus("Success")
        ], files: attachments.map(file => file.local)});
        // await client.database.guilds.write(interaction.guild.id, {[`tags.${name}`]: value});
        client.database.guilds.write(
            message.guild.id,
            {[`logging.attachments.saved.${message.channel.id}${message.id}`]: m.url}
        );
        return {files: attachments, jump: m.url};
    } else {
        return {files: attachments};
    }
}

export interface AttachmentLogSchema {
    files: {
        url: string,
        local: string,
        height: number | null,
        width: number | null
    }[],
    jump?: string;
}