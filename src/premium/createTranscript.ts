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
    ThreadChannel
} from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";
import { messageException } from '../utils/createTemporaryStorage.js';

const noTopic = new EmojiEmbed()
    .setTitle("User not found")
    .setDescription("There is no user associated with this ticket.")
    .setStatus("Danger")
    .setEmoji("CONTROL.BLOCKCROSS")

export default async function (interaction: CommandInteraction | MessageComponentInteraction) {
    if (interaction.channel === null) return;
    if (!(interaction.channel instanceof TextChannel || interaction.channel instanceof ThreadChannel)) return;
    const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;

    let messages: Message[] = [];
    let deletedCount: number;

    do {
        const fetched = await (interaction.channel as TextChannel).messages.fetch({ limit: 100 });
        const deleted = await (interaction.channel as TextChannel).bulkDelete(fetched, true);
        deletedCount = deleted.size;
        messages = messages.concat(Array.from(deleted.values() as Iterable<Message>));
        if (messages.length === 1) messageException(interaction.guild!.id, interaction.channel.id, messages[0]!.id)
    } while (deletedCount === 100);
    messages = messages.filter(message => !(
        message.components.some(
            component => component.components.some(
                child => child.customId?.includes("transcript") ?? false
            )
        )
    ));

    let topic
    let member: GuildMember = interaction.guild?.members.me!;
    if (interaction.channel instanceof TextChannel) {
        topic = interaction.channel.topic;
        if (topic === null) return await interaction.reply({ embeds: [noTopic] });
        const mem = interaction.guild!.members.cache.get(topic.split(" ")[1]!);
        if (mem) member = mem;
    } else {
        topic = interaction.channel.name;
        const split = topic.split("-").map(p => p.trim()) as [string, string, string];
        const mem = interaction.guild!.members.cache.get(split[1])
        if (mem) member = mem;
    }

    const newOut = await client.database.transcripts.createTranscript(messages, interaction, member);

    const code = await client.database.transcripts.create(newOut);
    if(!code) return await interaction.reply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Error")
                .setDescription("An error occurred while creating the transcript.")
                .setStatus("Danger")
                .setEmoji("CONTROL.BLOCKCROSS")
        ]
    })
    const guildConfig = await client.database.guilds.read(interaction.guild!.id);
    const m: Message = (await interaction.reply({
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
                new ButtonBuilder().setLabel("View").setStyle(ButtonStyle.Link).setURL(`https://clicks.codes/nucleus/transcript?code=${code}`),
                new ButtonBuilder()
                    .setLabel("Delete")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId("close")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
            ])
        ],
        fetchReply: true
    })) as Message;
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
            ticketFor: entry(member.id, renderUser(member.user)),
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
