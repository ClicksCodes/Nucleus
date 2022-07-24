import Discord, { MessageButton, MessageActionRow } from "discord.js";
import client from "../../utils/client.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

export default async function (interaction) {
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger

    let config = await client.database.guilds.read(interaction.guild.id);
    let thread = false; let threadChannel
    if (interaction.channel instanceof Discord.ThreadChannel) thread = true; threadChannel = interaction.channel as Discord.ThreadChannel
    let channel = (interaction.channel as Discord.TextChannel)
    if (!channel.parent || config.tickets.category != channel.parent.id || (thread ? (threadChannel.parent.parent.id != config.tickets.category) : false)) {
        return interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Deleting Ticket...")
            .setDescription("This ticket is not in your tickets category, so cannot be deleted. You cannot run close in a thread.")
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], ephemeral: true});
    }
    let status = channel.topic.split(" ")[1];
    if (status == "Archived") {
        await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Delete Ticket")
            .setDescription("Your ticket is being deleted...")
            .setStatus("Danger")
            .setEmoji("GUILD.TICKET.CLOSE")
        ]});
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
                ticketFor: entry(channel.topic.split(" ")[0], renderUser((await interaction.guild.members.fetch(channel.topic.split(" ")[0])).user)),
                deletedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                deleted: entry(new Date().getTime(), renderDelta(new Date().getTime()))
            },
            hidden: {
                guild: interaction.guild.id
            }
        }
        log(data);
        interaction.channel.delete();
        return;
    } else if (status == "Active") {
        await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Close Ticket")
            .setDescription("Your ticket is being closed...")
            .setStatus("Warning")
            .setEmoji("GUILD.TICKET.ARCHIVED")
        ]});
        let overwrites = [
            {
                id: channel.topic.split(" ")[0],
                deny: ["VIEW_CHANNEL"],
                type: "member"
            },
            {
                id: interaction.guild.id,
                deny: ["VIEW_CHANNEL"],
                type: "role"
            }
        ] as Discord.OverwriteResolvable[];
        if (config.tickets.supportRole != null) {
            overwrites.push({
                id: interaction.guild.roles.cache.get(config.tickets.supportRole),
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"],
                type: "role"
            })
        }
        channel.edit({permissionOverwrites: overwrites})
        channel.setTopic(`${channel.topic.split(" ")[0]} Archived`);
        let data = {
            meta:{
                type: 'ticketClosed',
                displayName: 'Ticket Closed',
                calculateType: "ticketUpdate",
                color: NucleusColors.yellow,
                emoji: 'GUILD.TICKET.ARCHIVED',
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(channel.topic.split(" ")[0], renderUser((await interaction.guild.members.fetch(channel.topic.split(" ")[0])).user)),
                closedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                closed: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketChannel: entry(channel.id, renderChannel(channel)),
            },
            hidden: {
                guild: interaction.guild.id
            }
        }
        log(data);
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setTitle("Close Ticket")
            .setDescription("This ticket has been closed.\nType `/ticket close` again to delete it.\n\nNote: Check `/privacy` for details about transcripts.")
            .setStatus("Warning")
            .setEmoji("GUILD.TICKET.ARCHIVED")
        ], components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel("Delete")
                    .setStyle("DANGER")
                    .setCustomId("closeticket")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                ].concat(client.database.premium.hasPremium(interaction.guild.id) ? [
                    new MessageButton()
                    .setLabel("Create Transcript and Delete")
                    .setStyle("PRIMARY")
                    .setCustomId("createtranscript")
                    .setEmoji(getEmojiByName("CONTROL.DOWNLOAD", "id"))
            ] : []))
        ]});
        return;
    }
}

async function purgeByUser(member, guild) {
    let config = await client.database.guilds.read(guild.id);
    if (!config.tickets.category) return;
    let tickets = guild.channels.cache.get(config.tickets.category);
    if (!tickets) return;
    let ticketChannels = tickets.children;
    let deleted = 0
    ticketChannels.forEach(element => {
        if (element.type != "GUILD_TEXT") return;
        if (element.topic.split(" ")[0] == member) {
            try { element.delete(); } catch {}
            deleted++
        }
    });
    if (deleted) {
        const { log, NucleusColors, entry, renderUser, renderDelta } = member.client.logger
        let data = {
            meta:{
                type: 'ticketPurge',
                displayName: 'Tickets Purged',
                calculateType: "ticketUpdate",
                color: NucleusColors.red,
                emoji: 'GUILD.TICKET.DELETE',
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(member, renderUser(member)),
                deletedBy: entry(null, "Member left server"),
                deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketsDeleted: deleted,
            },
            hidden: {
                guild: guild.id
            }
        }
        log(data);
    }
}

export { purgeByUser }