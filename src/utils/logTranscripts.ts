import type Discord from 'discord.js';

export interface JSONTranscriptSchema {
    messages: {
        content: string | null;
        attachments: {
            url: string;
            name: string;
            size: number;
        }[];
        authorID: string;
        authorUsername: string;
        authorUsernameColor: string;
        timestamp: string;
        id: string;
        edited: boolean;
    }[];
    channel: string;
    guild: string;
    timestamp: string;
}


export const JSONTranscriptFromMessageArray = (messages: Discord.Message[]): JSONTranscriptSchema | null => {
    if (messages.length === 0) return null;
    return {
        guild: messages[0]!.guild!.id,
        channel: messages[0]!.channel.id,
        timestamp: Date.now().toString(),
        messages: messages.map((message: Discord.Message) => {
            return {
                content: message.content,
                attachments: message.attachments.map((attachment: Discord.Attachment) => {
                    return {
                        url: attachment.url,
                        name: attachment.name!,
                        size: attachment.size,
                    };
                }),
                authorID: message.author.id,
                authorUsername: message.author.username + "#" + message.author.discriminator,
                authorUsernameColor: message.member!.displayHexColor.toString(),
                timestamp: message.createdTimestamp.toString(),
                id: message.id,
                edited: message.editedTimestamp ? true : false,
            };
        })
    };
}

export const JSONTranscriptToHumanReadable = (data: JSONTranscriptSchema): string => {
    let out = "";

    for (const message of data.messages) {
        const date = new Date(parseInt(message.timestamp));
        out += `${message.authorUsername} (${message.authorID}) [${date}]`;
        if (message.edited) out += " (edited)";
        if (message.content) out += "\nContent:\n" + message.content.split("\n").map((line: string) => `\n> ${line}`).join("");
        if (message.attachments.length > 0) out += "\nAttachments:\n" + message.attachments.map((attachment: { url: string; name: string; size: number; }) => `\n> [${attachment.name}](${attachment.url}) (${attachment.size} bytes)`).join("\n");

        out += "\n\n";
    }
    return out;
}