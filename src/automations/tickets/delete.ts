import Discord, { MessageButton, MessageActionRow } from "discord.js";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import readConfig from "../../utils/readConfig.js";

export default async function (interaction) {
    // @ts-ignore
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = interaction.client.logger

    let config = await readConfig(interaction.guild.id);
    let channel = (interaction.channel as Discord.TextChannel)
    if (config.tickets.category != channel.parent.id) {
        return interaction.reply({embeds: [new generateEmojiEmbed()
            .setTitle("Close Ticket")
            .setDescription("This ticket is not in your tickets category, so cannot be deleted.")
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], ephemeral: true});
    }
    let status = channel.topic.split(" ")[1];
    if (status == "Archived") {
        interaction.reply({embeds: [new generateEmojiEmbed()
            .setTitle("Close Ticket")
            .setDescription("This ticket will be deleted in 3 seconds.")
            .setStatus("Danger")
            .setEmoji("GUILD.TICKET.CLOSE")
        ]});
        setTimeout(async () => {
            let data = {
                meta:{
                    type: 'ticketClosed',
                    displayName: 'Ticket Closed',
                    calculateType: true,
                    color: NucleusColors.red,
                    emoji: 'GUILD.TICKET.CLOSE',
                    timestamp: new Date().getTime()
                },
                list: {
                    ticketFor: entry(channel.topic.split(" ")[0], renderUser((await interaction.guild.members.fetch(channel.topic.split(" ")[0])).user)),
                    closedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                    closed: entry(new Date().getTime(), renderDelta(new Date().getTime()))
                },
                hidden: {
                    guild: interaction.guild.id
                }
            }
            log(data, interaction.client);
            interaction.channel.delete();
        }, 3000);
        return;
    } else if (status == "Active") {
        interaction.reply({embeds: [new generateEmojiEmbed()
            .setTitle("Close Ticket")
            .setDescription("This ticket will be archived in 3 seconds.")
            .setStatus("Warning")
            .setEmoji("GUILD.TICKET.ARCHIVED")
        ]});
        setTimeout(async () =>{
            channel.permissionsFor(await interaction.guild.members.fetch(channel.topic.split(" ")[0])).remove("VIEW_CHANNEL");
            channel.setTopic(`${channel.topic.split(" ")[0]} Archived`);
            let data = {
                meta:{
                    type: 'ticketArchive',
                    displayName: 'Ticket Archived',
                    calculateType: true,
                    color: NucleusColors.yellow,
                    emoji: 'GUILD.TICKET.ARCHIVED',
                    timestamp: new Date().getTime()
                },
                list: {
                    ticketFor: entry(channel.topic.split(" ")[0], renderUser((await interaction.guild.members.fetch(channel.topic.split(" ")[0])).user)),
                    archivedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                    archived: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    ticketChannel: entry(channel.id, renderChannel(channel)),
                },
                hidden: {
                    guild: interaction.guild.id
                }
            }
            log(data, interaction.client);
            await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setTitle("Close Ticket")
                .setDescription("This ticket has been archived.\nType `/ticket close` to delete it.")
                .setStatus("Warning")
                .setEmoji("GUILD.TICKET.ARCHIVED") // TODO:[Premium] Add a transcript option  ||\----/|| <- the bridge we will cross when we come to it
            ], components: [new MessageActionRow().addComponents([new MessageButton()
                .setLabel("Close")
                .setStyle("DANGER")
                .setCustomId("closeticket")
                .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
            ])]});
        }, 3000);
        return;
    }
}

async function purgeByUser(member, guild) {
    let config = await readConfig(guild.id);
    if (!config.tickets.category) return;
    let tickets = guild.channels.cache.get(config.tickets.category);
    let ticketChannels = tickets.children;
    let deleted = 0
    ticketChannels.forEach(element => {
        if (element.type != "GUILD_TEXT") return;
        if (element.topic.split(" ")[0] == member) {
            element.delete();
            deleted++
        }
    });
    if (deleted) {
        try {
            const { log, NucleusColors, entry, renderUser, renderDelta } = member.client.logger
            let data = {
                meta:{
                    type: 'ticketPurge',
                    displayName: 'Tickets Purged',
                    calculateType: true,
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
            log(data, member.client);
        } catch {}
    }
}

export { purgeByUser }