import type { NucleusClient } from "../utils/client.js";
import Discord, { AuditLogEvent, ButtonStyle, GuildAuditLogsEntry, Message, User } from "discord.js";
import { imageDataEasterEgg } from "../utils/defaults.js";

export const event = "messageDelete";

export async function callback(client: NucleusClient, message: Message) {
    if (message.author.id === client.user!.id) return;
    if (message.author.bot) return;
    if (client.noLog.includes(`${message.guild!.id}/${message.channel.id}/${message.id}`)) return;
    const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderDelta, renderChannel } = client.logger;
    if (!(await isLogging(message.guild!.id, "messageDelete"))) return;
    const auditLog = (await getAuditLog(message.guild!, AuditLogEvent.MemberBanAdd)).filter(
        (entry: GuildAuditLogsEntry) => (entry.target! as User).id === message.author.id
    )[0];
    if (auditLog) {
        if (auditLog.createdTimestamp - 1000 < Date.now()) return;
    }
    const replyTo = message.reference;
    let content = message.cleanContent;
    content.replace("`", "\\`");
    if (content.length > 256) content = content.substring(0, 253) + "...";
    const attachments =
        message.attachments.size +
        (
            message.content.match(
                /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi
            ) ?? []
        ).length;
    let attachmentJump = "";
    const config = (await client.database.guilds.read(message.guild!.id)).logging.attachments.saved[
        message.channel.id + message.id
    ];
    if (config) {
        attachmentJump = ` [[View attachments]](${config})`;
    }
    const imageData = JSON.stringify({ data: message.content, extra: imageDataEasterEgg }, null, 2);
    const data = {
        meta: {
            type: "messageDelete",
            displayName: "Message Deleted",
            calculateType: "messageDelete",
            color: NucleusColors.red,
            emoji: "MESSAGE.DELETE",
            timestamp: Date.now(),
            imageData: imageData,
            buttons: [{ buttonText: "View text", buttonId: "log:message.delete", buttonStyle: ButtonStyle.Secondary }]
        },
        separate: {
            start: content ? `**Message:**\n\`\`\`${content}\`\`\`` : "**Message:** *Message had no content*"
        },
        list: {
            messageId: entry(message.id, `\`${message.id}\``),
            sentBy: entry(message.author.id, renderUser(message.author)),
            sentIn: entry(
                message.channel.id,
                renderChannel(message.channel as Discord.GuildChannel | Discord.ThreadChannel)
            ),
            deleted: entry(Date.now(), renderDelta(Date.now())),
            mentions: message.mentions.users.size,
            attachments: entry(attachments, attachments + attachmentJump),
            repliedTo: entry(
                replyTo ? replyTo.messageId! : null,
                replyTo
                    ? `[[Jump to message]](https://discord.com/channels/${message.guild!.id}/${message.channel.id}/${
                          replyTo.messageId
                      })`
                    : "None"
            )
        },
        hidden: {
            guild: message.guild!.id
        }
    };
    await log(data);
}
