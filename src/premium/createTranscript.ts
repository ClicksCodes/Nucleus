import {
    CommandInteraction,
    GuildMember,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    TextChannel,
    ButtonStyle,
    User,
    ComponentType
} from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import { PasteClient, Publicity, ExpireDate } from "pastebin-api";
import client from "../utils/client.js";

const pbClient = new PasteClient(client.config.pastebinApiKey);

interface TranscriptEmbed {
    title?: string;
    description?: string;
    fields?: {
        name: string;
        value: string;
        inline: boolean;
    }[];
    footer?: {
        text: string;
        iconURL?: string;
    };
}

interface TranscriptComponent {
    type: number;
    style?: ButtonStyle;
    label?: string;
    description?: string;
    placeholder?: string;
    emojiURL?: string;
}

interface TranscriptAuthor {
    username: string;
    discriminator: number;
    nickname?: string;
    id: string;
    iconURL?: string;
    topRole: {
        color: number;
        badgeURL?: string;
    }
}

interface TranscriptAttachment {
    url: string;
    filename: string;
    size: number;
    log?: string;
}

interface TranscriptMessage {
    id: string;
    author: TranscriptAuthor;
    content?: string;
    embeds?: TranscriptEmbed[];
    components?: TranscriptComponent[][];
    editedTimestamp?: number;
    createdTimestamp: number;
    flags?: string[];
    attachments?: TranscriptAttachment[];
    stickerURLs?: string[];
    referencedMessage?: string | [string, string, string];
}

interface Transcript {
    type: "ticket" | "purge"
    guild: string;
    channel: string;
    messages: TranscriptMessage[];
    createdTimestamp: number;
    createdBy: TranscriptAuthor;
}

export default async function (interaction: CommandInteraction | MessageComponentInteraction) {
    if (interaction.channel === null) return;
    if (!(interaction.channel instanceof TextChannel)) return;
    const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;

    let messages: Message[] = [];
    let deletedCount: number;

    do {
        const fetched = await (interaction.channel as TextChannel).messages.fetch({ limit: 100 });
        const deleted = await (interaction.channel as TextChannel).bulkDelete(fetched, true);
        deletedCount = deleted.size;
        messages = messages.concat(Array.from(deleted.values() as Iterable<Message>));
    } while (deletedCount === 100);

    let out = "";
    messages.reverse().forEach((message) => {
        if (!message.author.bot) {
            const sentDate = new Date(message.createdTimestamp);
            out += `${message.author.username}#${message.author.discriminator} (${
                message.author.id
            }) [${sentDate.toUTCString()}]\n`;
            const lines = message.content.split("\n");
            lines.forEach((line) => {
                out += `> ${line}\n`;
            });
            out += "\n\n";
        }
    });

    let interactionMember = await interaction.guild?.members.fetch(interaction.user.id)

    let newOut: Transcript = {
        type: "ticket",
        guild: interaction.guild!.id,
        channel: interaction.channel!.id,
        messages: [],
        createdTimestamp: Date.now(),
        createdBy: {
            username: interaction.user.username,
            discriminator: parseInt(interaction.user.discriminator),
            id: interaction.user.id,
            topRole: {
                color: interactionMember?.roles.highest.color ?? 0x000000
            }
        }
    }
    if(interactionMember?.roles.icon) newOut.createdBy.topRole.badgeURL = interactionMember.roles.icon.iconURL()!;
    messages.reverse().forEach((message) => {
        let msg: TranscriptMessage = {
            id: message.id,
            author: {
                username: message.author.username,
                discriminator: parseInt(message.author.discriminator),
                id: message.author.id,
                topRole: {
                    color: message.member!.roles.highest.color
                }
            },
            createdTimestamp: message.createdTimestamp
        };
        if (message.member!.roles.icon) msg.author.topRole.badgeURL = message.member!.roles.icon.iconURL()!;
        if (message.content) msg.content = message.content;
        if (message.embeds.length > 0) msg.embeds = message.embeds.map(embed => {
            let obj: TranscriptEmbed = {};
            if (embed.title) obj.title = embed.title;
            if (embed.description) obj.description = embed.description;
            if (embed.fields.length > 0) obj.fields = embed.fields.map(field => {
                return {
                    name: field.name,
                    value: field.value,
                    inline: field.inline ?? false
                }
            });
            if (embed.footer) obj.footer = {
                text: embed.footer.text,
            };
            if (embed.footer?.iconURL) obj.footer!.iconURL = embed.footer.iconURL;
            return obj;
        });
        if (message.components.length > 0) msg.components = message.components.map(component => component.components.map(child => {
            let obj: TranscriptComponent = {
                type: child.type
            }
            if (child.type === ComponentType.Button) {
                obj.style = child.style;
                obj.label = child.label ?? "";
            } else if (child.type > 2) {
                obj.placeholder = child.placeholder ?? "";
            }
            return obj
        }));
        if (message.editedTimestamp) msg.editedTimestamp = message.editedTimestamp;
        if (message.flags) msg.flags = message.flags.toArray();

        if (message.stickers.size > 0) msg.stickerURLs = message.stickers.map(sticker => sticker.url);
        if (message.reference) msg.referencedMessage = [message.reference.guildId ?? "", message.reference.channelId, message.reference.messageId ?? ""];

    });

    const topic = interaction.channel.topic;
    let member: GuildMember | null = null;
    if (topic !== null) {
        const part = topic.split(" ")[0] ?? null;
        if (part !== null) member = interaction.guild!.members.cache.get(part) ?? null;
    }
    let m: Message;
    if (out !== "") {
        const url = await pbClient.createPaste({
            code: out,
            expireDate: ExpireDate.Never,
            name:
                `Ticket Transcript ${
                    member ? "for " + member.user.username + "#" + member.user.discriminator + " " : ""
                }` + `(Created at ${new Date(interaction.channel.createdTimestamp).toDateString()})`,
            publicity: Publicity.Unlisted
        });
        const guildConfig = await client.database.guilds.read(interaction.guild!.id);
        m = (await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Transcript")
                    .setDescription(
                        "You can view the transcript using the link below. You can save the link for later" +
                            (guildConfig.logging.logs.channel
                                ? ` or find it in <#${guildConfig.logging.logs.channel}> once you press delete below. After this the channel will be deleted.`
                                : ".")
                    )
                    .setStatus("Success")
                    .setEmoji("CONTROL.DOWNLOAD")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder().setLabel("View").setStyle(ButtonStyle.Link).setURL(url),
                    new ButtonBuilder()
                        .setLabel("Delete")
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId("close")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                ])
            ],
            fetchReply: true
        })) as Message;
    } else {
        m = (await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Transcript")
                    .setDescription(
                        "The transcript was empty, so no changes were made. To delete this ticket, press the delete button below."
                    )
                    .setStatus("Success")
                    .setEmoji("CONTROL.DOWNLOAD")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel("Delete")
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId("close")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                ])
            ],
            fetchReply: true
        })) as Message;
    }
    let i;
    try {
        i = await m.awaitMessageComponent({
            time: 300000,
            filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.message.id === m.id }
        });
        await i.deferUpdate();
    } catch {
        return;
    }
    const data = {
        meta: {
            type: "ticketDeleted",
            displayName: "Ticket Deleted",
            calculateType: "ticketUpdate",
            color: NucleusColors.red,
            emoji: "GUILD.TICKET.CLOSE",
            timestamp: Date.now()
        },
        list: {
            ticketFor: member ? entry(member.id, renderUser(member.user)) : entry(null, "*Unknown*"),
            deletedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user as User)),
            deleted: entry(Date.now().toString(), renderDelta(Date.now()))
        },
        hidden: {
            guild: interaction.guild!.id
        }
    };
    log(data);
    await interaction.channel.delete();
    return;
}
