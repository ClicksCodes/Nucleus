import { MessageActionRow, MessageButton, TextChannel } from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import { PasteClient, Publicity, ExpireDate } from "pastebin-api";
import config from '../config/main.json' assert {type: 'json'};
import client from "../utils/client.js";

const pbClient = new PasteClient(config.pastebinApiKey)

export default async function (interaction) {
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger

    let messages = []
    let deleted = 100;

    while (deleted == 100) {
        let fetched;
        await (interaction.channel as TextChannel).messages.fetch({limit: 100}).then(async (ms) => {
            fetched = await (interaction.channel as TextChannel).bulkDelete(ms, true);
        })
        deleted = fetched.size
        if (fetched) {
            messages = messages.concat(fetched.map(m => m))
        }
    }
    let out = ""
    messages.reverse().forEach(message => {
        if (!message.author.bot) {
            let sentDate = new Date(message.createdTimestamp)
            out += `${message.author.username}#${message.author.discriminator} (${message.author.id}) [${sentDate.toUTCString()}]\n`
            let lines = message.content.split("\n")
            lines.forEach(line => {out += `> ${line}\n`})
            out += `\n\n`
        }
    })
    let member = interaction.channel.guild.members.cache.get(interaction.channel.topic.split(" ")[0])
    let m;
    if (out !== "") {
        const url = await pbClient.createPaste({
            code: out,
            expireDate: ExpireDate.Never,
            name: `Ticket Transcript for ${member.user.username}#${member.user.discriminator} (Created at ${new Date(interaction.channel.createdTimestamp).toDateString()})`,
            publicity: Publicity.Unlisted,
        })
        let guildConfig = await client.database.guilds.read(interaction.guild.id);
        m = await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Transcript")
            .setDescription(`You can view the transcript using the link below. You can save the link for later` + (guildConfig.logging.logs.channel ?
                ` or find it in <#${guildConfig.logging.logs.channel}> once you press delete below. After this the channel will be deleted.`
                : "."))
            .setStatus("Success")
            .setEmoji("CONTROL.DOWNLOAD")
        ], components: [new MessageActionRow().addComponents([
            new MessageButton()
                .setLabel("View")
                .setStyle("LINK")
                .setURL(url),
            new MessageButton()
                .setLabel("Delete")
                .setStyle("DANGER")
                .setCustomId("close")
                .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
        ])], fetchReply: true});
    } else {
        m = await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Transcript")
            .setDescription(`The transcript was empty, so no changes were made. To delete this ticket, press the delete button below.`)
            .setStatus("Success")
            .setEmoji("CONTROL.DOWNLOAD")
        ], components: [new MessageActionRow().addComponents([
            new MessageButton()
                .setLabel("Delete")
                .setStyle("DANGER")
                .setCustomId("close")
                .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
        ])], fetchReply: true});
    }
    let i;
    try {
        i = await m.awaitMessageComponent({ time: 300000 });
        i.deferUpdate()
    } catch (e) { }
    let data = {
        meta:{
            type: 'ticketDeleted',
            displayName: 'Ticket Deleted',
            calculateType: "ticketUpdate",
            color: NucleusColors.red,
            emoji: 'GUILD.TICKET.CLOSE',
            timestamp: new Date().getTime()
        },
        list: {
            ticketFor: entry(interaction.channel.topic.split(" ")[0], renderUser((await interaction.guild.members.fetch(interaction.channel.topic.split(" ")[0])).user)),
            deletedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
            deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
        },
        hidden: {
            guild: interaction.guild.id
        }
    }
    log(data);
    await interaction.channel.delete()
    return
}