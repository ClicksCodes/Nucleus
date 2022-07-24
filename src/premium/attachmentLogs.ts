import client from '../utils/client.js';
import keyValueList from '../utils/generateKeyValueList.js';
import singleNotify from '../utils/singleNotify.js';
import { saveAttachment } from '../reflex/scanners.js';
import EmojiEmbed from '../utils/generateEmojiEmbed.js';
import addPlural from '../utils/plurals.js';


export default async function logAttachment(message): Promise<AttachmentLogSchema> {
    const { renderUser, renderChannel, renderDelta } = client.logger;
    let attachments = []
    for (let attachment of message.attachments.values()) {
        attachments.push({local: await saveAttachment(attachment.url), url: attachment.url})
    }
    let links = message.content.match(/https?:\/\/\S+/gi) || [];
    for (let link of links) {
        if (link.toLowerCase().match(/\.(jpg|jpeg|png|gif|gifv|webm|webp|mp4|wav|mp3|ogg)$/gi)) {
            attachments.push({local: await saveAttachment(link), url: link})
        }
    }
    if (attachments.length == 0) return {files: []}
    if (client.database.premium.hasPremium(message.guild.id)) {
        let channel = (await client.database.guilds.read(message.guild.id)).logging.attachments.channel;
        if (!channel) {
            singleNotify("noAttachmentLogChannel", message.guild.id, "No channel set for attachment logging", "Warning");
            return {files: attachments};
        }
        let channelObj = await client.channels.fetch(channel);
        if (!channelObj) {
            singleNotify("attachmentLogChannelDeleted", message.guild.id, "Attachment history channel was deleted", "Warning");
            return {files: attachments};
        }
        let m = await channelObj.send({embeds: [new EmojiEmbed()
            .setTitle(`${addPlural(attachments.length, "Attachment")} Sent`)
            .setDescription(keyValueList({
                "messageId": `\`${message.id}\``,
                "sentBy": renderUser(message.author),
                "sentIn": renderChannel(message.channel),
                "sent": renderDelta(new Date(message.createdTimestamp)),
            }) + `\n[[Jump to message]](${message.url})`)
            .setEmoji("ICONS.ATTACHMENT")
            .setStatus("Success")
        ], files: attachments.map(file => file.local)});
        // await client.database.guilds.write(interaction.guild.id, {[`tags.${name}`]: value});
        client.database.guilds.write(
            message.guild.id,
            {[`logging.attachments.saved.${message.channel.id}${message.id}`]: m.url},
        );
        return {files: attachments, jump: m.url};
    } else {
        return {files: attachments};
    }
}

export interface AttachmentLogSchema {
    files: {
        url: string,
        local: string;
    }[],
    jump?: string;
}