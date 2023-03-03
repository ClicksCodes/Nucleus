import { getCommandMentionByName } from '../../utils/getCommandDataByName.js';
import Discord, { ActionRowBuilder, ButtonBuilder, ButtonInteraction, PrivateThreadChannel, TextChannel, ButtonStyle, CategoryChannel } from "discord.js";
import client from "../../utils/client.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { preloadPage } from '../../utils/createTemporaryStorage.js';
import { LoadingEmbed } from '../../utils/defaults.js';

export default async function (interaction: Discord.CommandInteraction | ButtonInteraction) {
    if (!interaction.guild) return;
    const config = await client.database.guilds.read(interaction.guild.id);
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger;
    const ticketChannel = config.tickets.category;
    if (!("parent" in interaction.channel!)) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Not a ticket")
                    .setDescription("This channel isn't a ticket, so you can't delete it.")
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ], ephemeral: true
        });
    } else if (interaction.channel!.parent!.id !== ticketChannel) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Not a ticket")
                    .setDescription("This channel isn't a ticket, so you can't delete it.")
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ], ephemeral: true
        });
    }
    const channel: PrivateThreadChannel | TextChannel = interaction.channel as PrivateThreadChannel | TextChannel;
    let status: string | null = ("topic" in interaction.channel) ? interaction.channel!.topic : interaction.channel.name;
    status = status ?? "";
    if (status.endsWith("Archived")) { status = "Archived"; }
    else { status = "Active"; }

    const uID = channel.type === Discord.ChannelType.PrivateThread ? channel.name.split(" - ")[1] : channel.topic!.split(" ")[0];

    if (status === "Archived") {
        // Delete the ticket

        const data = {
            meta: {
                type: "ticketClosed",
                displayName: "Ticket Closed",
                calculateType: "ticketUpdate",
                color: NucleusColors.red,
                emoji: "GUILD.TICKET.CLOSE",
                timestamp: Date.now()
            },
            list: {
                ticketFor: entry(
                    uID!,
                    renderUser((await interaction.guild.members.fetch(uID!)).user)
                ),
                closedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user as Discord.User)),
                closed: entry(Date.now(), renderDelta(Date.now())),
                ticketChannel: entry(channel.id, channel.name)
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);

        await channel.delete();
    } else if (status === "Active") {
        await interaction.reply({embeds: LoadingEmbed, fetchReply: true});
        // Archive the ticket
        await interaction.channel.fetch()
        if (channel.isThread()) {
            channel.setName(`${channel.name.replace("Active", "Archived")}`);
            channel.members.remove(channel.name.split(" - ")[1]!);
        } else {
            channel.setTopic(`${(channel.topic ?? "").replace("Active", "Archived")}`);
            if (!channel.topic!.includes("Archived")) { channel.setTopic("0 Archived"); }
            await channel.permissionOverwrites.delete(channel.topic!.split(" ")[0]!);
        }
        preloadPage(interaction.channel.id, "privacy", "2")
        const hasPremium = await client.database.premium.hasPremium(interaction.guild.id);
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Archived Ticket")
                    .setDescription(`This ticket has been Archived. Type ${getCommandMentionByName("ticket/close")} to delete it.\n` +
                        hasPremium ? ("Creating a transcript will delete all messages in this ticket" +
                        `\n\nFor more info on transcripts, check ${getCommandMentionByName("privacy")}`): "")
                    .setStatus("Warning")
                    .setEmoji("GUILD.TICKET.ARCHIVED")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    [
                        new ButtonBuilder()
                            .setLabel("Delete")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId("closeticket")
                            .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    ].concat(
                        hasPremium
                            ? [
                                    new ButtonBuilder()
                                        .setLabel("Create Transcript and Delete")
                                        .setStyle(ButtonStyle.Primary)
                                        .setCustomId("createtranscript")
                                        .setEmoji(getEmojiByName("CONTROL.DOWNLOAD", "id"))
                                ]
                            : []
                    )
                )
            ]
        });
        const data = {
            meta: {
                type: "ticketClosed",
                displayName: "Ticket Archived",
                calculateType: "ticketUpdate",
                color: NucleusColors.yellow,
                emoji: "GUILD.TICKET.ARCHIVED",
                timestamp: Date.now()
            },
            list: {
                ticketFor: entry(
                    uID!,
                    renderUser((await interaction.guild.members.fetch(uID!)).user)
                ),
                archivedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user as Discord.User)),
                archived: entry(Date.now(), renderDelta(Date.now())),
                ticketChannel: entry(channel.id, renderChannel(channel))
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);
    }
    return;
}


async function purgeByUser(member: string, guild: string) {
    const config = await client.database.guilds.read(guild);
    const fetchedGuild = await client.guilds.fetch(guild);
    if (!config.tickets.category) return;
    const tickets: CategoryChannel | TextChannel | undefined = fetchedGuild.channels.cache.get(config.tickets.category) as CategoryChannel | TextChannel | undefined;
    if (!tickets) return;
    let deleted = 0;
    if (tickets.type === Discord.ChannelType.GuildCategory) {
        // For channels, the topic is the user ID, then the word Active
        const category = tickets as Discord.CategoryChannel;
        category.children.cache.forEach((element) => {
            if (!(element.type === Discord.ChannelType.GuildText)) return;
            if (!(((element as Discord.TextChannel).topic ?? "").includes(member))) return;
            try {
                element.delete();
                deleted++;
            } catch (e) {
                console.error(e);
            }
        });
    } else {
        // For threads, the name is the users name, id, then the word Active
        const channel = tickets as Discord.TextChannel;
        channel.threads.cache.forEach((element: Discord.ThreadChannel) => {
            if (!element.name.includes(member)) return;
            try {
                element.delete();
                deleted++;
            } catch (e) {
                console.error(e);
            }
        });
    }
    if (!deleted) return
    const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
    const data = {
        meta: {
            type: "ticketPurge",
            displayName: "Tickets Purged",
            calculateType: "ticketUpdate",
            color: NucleusColors.red,
            emoji: "GUILD.TICKET.DELETE",
            timestamp: Date.now()
        },
        list: {
            ticketFor: entry(member, renderUser(member)),
            deletedBy: entry(null, "Member left server"),
            deleted: entry(Date.now(), renderDelta(Date.now())),
            ticketsDeleted: deleted
        },
        hidden: {
            guild: guild
        }
    };
    log(data);
}

export { purgeByUser };
