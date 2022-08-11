import { CommandInteraction, GuildMember, Message, MessageActionRow, MessageButton, TextChannel } from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import { PasteClient, Publicity, ExpireDate } from "pastebin-api";
import config from "../config/main.json" assert { type: "json" };
import client from "../utils/client.js";

const pbClient = new PasteClient(config.pastebinApiKey);

export default async function (interaction: CommandInteraction) {
    if (interaction.channel === null) return;
    if (!(interaction.channel instanceof TextChannel)) return;
    const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;

    let messages: Message[] = [];
    let deletedCount: number;

    do {
        const fetched = await (interaction.channel as TextChannel).messages.fetch({ limit: 100 });
        const deleted = await (interaction.channel as TextChannel).bulkDelete(fetched, true);
        deletedCount = deleted.size;
        messages = messages.concat(Array.from(deleted.values()));
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
                new MessageActionRow().addComponents([
                    new MessageButton().setLabel("View").setStyle("LINK").setURL(url),
                    new MessageButton()
                        .setLabel("Delete")
                        .setStyle("DANGER")
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
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setLabel("Delete")
                        .setStyle("DANGER")
                        .setCustomId("close")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                ])
            ],
            fetchReply: true
        })) as Message;
    }
    let i;
    try {
        i = await m.awaitMessageComponent({ time: 300000 });
        i.deferUpdate();
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
            timestamp: new Date().getTime()
        },
        list: {
            ticketFor: member ? entry(member.id, renderUser(member.user)) : entry(null, "*Unknown*"),
            deletedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user)),
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
        },
        hidden: {
            guild: interaction.guild!.id
        }
    };
    log(data);
    await interaction.channel.delete();
    return;
}
