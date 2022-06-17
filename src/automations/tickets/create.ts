import Discord, { MessageActionRow, MessageButton } from "discord.js";
import { tickets, toHexArray } from "../../utils/calculate.js";
import client from "../../utils/client.js";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

function capitalize(s: string) {
    s = s.replace(/([A-Z])/g, ' $1');
    return s.length < 3 ? s.toUpperCase() : s[0].toUpperCase() + s.slice(1).toLowerCase();
}

export default async function (interaction) {
    // @ts-ignore
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = interaction.client.logger

    let config = await client.database.read(interaction.guild.id);
    if (!config.tickets.enabled || !config.tickets.category) {
        return await interaction.reply({embeds: [new generateEmojiEmbed()
            .setTitle("Tickets are disabled")
            .setDescription("Please enable tickets in the configuration to use this command.")
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], ephemeral: true});
    }
    let category = interaction.guild.channels.cache.get(config.tickets.category) as Discord.CategoryChannel;
    let count = 0;
    category.children.forEach(element => {
        if (!(element.type == "GUILD_TEXT")) return;
        if ((element as Discord.TextChannel).topic.includes(`${interaction.member.user.id}`)) {
            if ((element as Discord.TextChannel).topic.endsWith("Active")) {
                count++;
            }
        }
    });
    if (count >= config.tickets.maxTickets) {
        return await interaction.reply({embeds: [new generateEmojiEmbed()
            .setTitle("Create Ticket")
            .setDescription(`You have reached the maximum amount of tickets (${config.tickets.maxTickets}). Please close one of your active tickets before creating a new one.`)
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], ephemeral: true});
    }
    let ticketTypes;
    let custom = false
    if (config.tickets.customTypes) { ticketTypes = config.tickets.customTypes; custom = true }
    else if (config.tickets.types) ticketTypes = toHexArray(config.tickets.types, tickets);
    else ticketTypes = [];
    let chosenType;
    let splitFormattedTicketTypes = [];
    if (ticketTypes.length > 0) {
        let formattedTicketTypes = [];
        formattedTicketTypes = ticketTypes.map(type => {
            if (custom) {
                return new MessageButton()
                    .setLabel(type)
                    .setStyle("PRIMARY")
                    .setCustomId(type)
            } else {
                return new MessageButton()
                    .setLabel(capitalize(type))
                    .setStyle("PRIMARY")
                    .setCustomId(type)
                    .setEmoji(getEmojiByName(("TICKETS." + type.toString().toUpperCase()), "id"));
            }
        });
        for (let i = 0; i < formattedTicketTypes.length; i += 5) {
            splitFormattedTicketTypes.push(new MessageActionRow().addComponents(formattedTicketTypes.slice(i, i + 5)));
        }
        let m = await interaction.reply({embeds: [new generateEmojiEmbed()
            .setTitle("Create Ticket")
            .setDescription("Select a ticket type")
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        ], ephemeral: true, fetchReply: true, components: splitFormattedTicketTypes});
        let component;
        try {
            component = await (m as Discord.Message).awaitMessageComponent({time: 300000});
        } catch (e) {
            return;
        }
        chosenType = component.customId;
        splitFormattedTicketTypes = [];
        formattedTicketTypes = [];
        formattedTicketTypes = ticketTypes.map(type => {
            if (custom) {
                return new MessageButton()
                    .setLabel(type)
                    .setStyle(chosenType == type ? "SUCCESS" : "SECONDARY")
                    .setCustomId(type)
                    .setDisabled(true)
                } else {
                    return new MessageButton()
                    .setLabel(capitalize(type))
                    .setStyle(chosenType == type ? "SUCCESS" : "SECONDARY")
                    .setCustomId(type)
                    .setEmoji(getEmojiByName(("TICKETS." + type.toString().toUpperCase()), "id"))
                    .setDisabled(true)
            }
        });
        for (let i = 0; i < formattedTicketTypes.length; i += 5) {
            splitFormattedTicketTypes.push(new MessageActionRow().addComponents(formattedTicketTypes.slice(i, i + 5)));
        }
        component.update({embeds: [new generateEmojiEmbed()
            .setTitle("Create Ticket")
            .setDescription("Select a ticket type")
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        ], components: splitFormattedTicketTypes});
    } else {
        chosenType = null
        await interaction.reply({embeds: [new generateEmojiEmbed()
            .setTitle("Create Ticket")
            .setEmoji("GUILD.TICKET.OPEN")
        ], ephemeral: true, components: splitFormattedTicketTypes})
    }
    let overwrites = [{
        id: interaction.member,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"],
        type: "member"
    }] as Discord.OverwriteResolvable[];
    overwrites.push({
        id: interaction.guild.roles.everyone,
        deny: ["VIEW_CHANNEL"],
        type: "role"
    })
    if (config.tickets.supportRole != null) {
        overwrites.push({
            id: interaction.guild.roles.cache.get(config.tickets.supportRole),
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"],
            type: "role"
        })
    }

    let c;
    try {
        c = await interaction.guild.channels.create(interaction.member.user.username, {
            type: "GUILD_TEXT",
            topic: `${interaction.member.user.id} Active`,
            parent: config.tickets.category,
            nsfw: false,
            permissionOverwrites: (overwrites as Discord.OverwriteResolvable[]),
            reason: "Creating ticket"
        })
    } catch (e) {
        return await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setTitle("Create Ticket")
            .setDescription("Failed to create ticket")
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ]});
    }
    try {
        await c.send(
            {
                content: (`<@${interaction.member.user.id}>` + (config.tickets.supportRole != null ? ` • <@&${config.tickets.supportRole}>` : "")),
                allowedMentions: {
                    users: [(interaction.member as Discord.GuildMember).id],
                    roles: (config.tickets.supportRole != null ? [config.tickets.supportRole] : [])
                }
            }
        )
        let content = interaction.options ? interaction.options.getString("message") || "" : "";
        if (content) content = `**Message:**\n> ${content}\n`;
        let emoji = custom ? "" : getEmojiByName("TICKETS." + chosenType.toUpperCase());
        await c.send({ embeds: [new generateEmojiEmbed()
            .setTitle("New Ticket")
            .setDescription(
                `Ticket created by <@${interaction.member.user.id}>\n` +
                `**Support type:** ${chosenType != null ? (emoji) + " " + capitalize(chosenType) : "General"}\n` +
                `**Ticket ID:** \`${c.id}\`\n${content}\n` +
                `Type \`/ticket close\` to archive this ticket.`,
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        ], components: [new MessageActionRow().addComponents([new MessageButton()
            .setLabel("Close")
            .setStyle("DANGER")
            .setCustomId("closeticket")
            .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
        ])]})
        let data = {
            meta:{
                type: 'ticketCreate',
                displayName: 'Ticket Created',
                calculateType: true,
                color: NucleusColors.green,
                emoji: 'GUILD.TICKET.OPEN',
                timestamp: new Date().getTime()
            },
            list: {
                ticketFor: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                created: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketChannel: entry(c.id, renderChannel(c)),
            },
            hidden: {
                guild: interaction.guild.id
            }
        }
        log(data, interaction.client);
    } catch (e) { console.log(e)}
    await interaction.editReply({embeds: [new generateEmojiEmbed()
        .setTitle("Create Ticket")
        .setDescription(`Ticket created. You can view it here: <#${c.id}>`)
        .setStatus("Success")
        .setEmoji("GUILD.TICKET.OPEN")
    ], components: splitFormattedTicketTypes});
}