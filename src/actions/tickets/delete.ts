import { getCommandMentionByName } from '../../utils/getCommandMentionByName.js';
import Discord, { ActionRowBuilder, ButtonBuilder, ButtonInteraction, PrivateThreadChannel, TextChannel, ButtonStyle } from "discord.js";
import client from "../../utils/client.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { preloadPage } from '../../utils/createTemporaryStorage.js';

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
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(
                    uID!,
                    renderUser((await interaction.guild.members.fetch(uID!)).user)
                ),
                closedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user as Discord.User)),
                closed: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketChannel: entry(channel.id, channel.name)
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);

        await channel.delete();
    } else if (status === "Active") {
        // Close the ticket

        if (channel.isThread()) {
            channel.setName(`${channel.name.replace("Active", "Archived")}`);
            channel.members.remove(channel.name.split(" - ")[1]!);
        } else {
            channel.setTopic(`${(channel.topic ?? "").replace("Active", "Archived")}`);
            if (!channel.topic!.includes("Archived")) { channel.setTopic("0 Archived"); }
            await channel.permissionOverwrites.delete(channel.topic!.split(" ")[0]!);
        }
        preloadPage(interaction.channel.id, "privacy", "2")
        await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Archived Ticket")
                    .setDescription(`This ticket has been Archived. Type ${await getCommandMentionByName("ticket/close")} to delete it.` +
                        await client.database.premium.hasPremium(interaction.guild.id) ?
                        `\n\nFor more info on transcripts, check ${await getCommandMentionByName("privacy")}` :
                        "")
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
                        await client.database.premium.hasPremium(interaction.guild.id)
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
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(
                    uID!,
                    renderUser((await interaction.guild.members.fetch(uID!)).user)
                ),
                archivedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user as Discord.User)),
                archived: entry(new Date().getTime(), renderDelta(new Date().getTime())),
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
    const config = await client.database.guilds.read(guild.id);
    const fetchedGuild = await client.guilds.fetch(guild);
    if (!config.tickets.category) return;
    const tickets = fetchedGuild.channels.cache.get(config.tickets.category);
    if (!tickets) return;
    const ticketChannels = tickets.children;
    let deleted = 0;
    ticketChannels.forEach((element) => {
        if (element.type !== "GUILD_TEXT") return;
        if (element.topic.split(" ")[0] === member) {
            try {
                element.delete();
            } catch {
                /* Errors if the channel does not exist (deleted already) */
            }
            deleted++;
        }
    });
    if (deleted) {
        const { log, NucleusColors, entry, renderUser, renderDelta } = member.client.logger;
        const data = {
            meta: {
                type: "ticketPurge",
                displayName: "Tickets Purged",
                calculateType: "ticketUpdate",
                color: NucleusColors.red,
                emoji: "GUILD.TICKET.DELETE",
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(member, renderUser(member)),
                deletedBy: entry(null, "Member left server"),
                deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketsDeleted: deleted
            },
            hidden: {
                guild: guild.id
            }
        };
        log(data);
    }
}

export { purgeByUser };