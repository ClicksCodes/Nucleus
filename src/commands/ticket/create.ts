import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import { tickets, toHexArray, toHexInteger } from "../../utils/calculate.js";
import readConfig from "../../utils/readConfig.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

function capitalize(s: string) {
    s = s.replace(/([A-Z])/g, ' $1');
    return s.length < 3 ? s.toUpperCase() : s[0].toUpperCase() + s.slice(1).toLowerCase();
}

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("create")
    .setDescription("Creates a new modmail ticket")
    .addStringOption(option => option.setName("message").setDescription("The content of the ticket").setRequired(false))

const callback = async (interaction: CommandInteraction) => {
    // @ts-ignore
    const { log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = interaction.client.logger

    let config = await readConfig(interaction.guild.id);
    if (!config.tickets.enabled || !config.tickets.category) {
        return await interaction.reply({embeds: [new EmojiEmbed()
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
        return await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Create Ticket")
            .setDescription(`You have reached the maximum amount of tickets (${config.tickets.maxTickets}). Please close one of your active tickets before creating a new one.`)
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], ephemeral: true});
    }
    let ticketTypes
    if (config.tickets.customTypes) ticketTypes = config.tickets.customTypes;
    else if (config.tickets.types) ticketTypes = toHexArray(config.tickets.types, tickets);
    else ticketTypes = [];
    let chosenType;
    if (ticketTypes.length > 0) {
        let splitFormattedTicketTypes = [];
        let formattedTicketTypes = [];
        formattedTicketTypes = ticketTypes.map(type => {
            return new MessageButton()
                .setLabel(capitalize(type))
                .setStyle("PRIMARY")
                .setCustomId(type)
                .setEmoji(getEmojiByName(("TICKETS." + type.toString().toUpperCase()), "id"));
        });
        for (let i = 0; i < formattedTicketTypes.length; i += 4) {
            splitFormattedTicketTypes.push(new MessageActionRow().addComponents(formattedTicketTypes.slice(i, i + 4)));
        }
        let m = await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Create Ticket")
            .setDescription("Please select a ticket type")
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        ], ephemeral: true, fetchReply: true, components: splitFormattedTicketTypes});
        let component;
        try {
            component = await (m as Discord.Message).awaitMessageComponent({time: 2.5 * 60 * 1000});
        } catch (e) {
            return;
        }
        component.deferUpdate();
        chosenType = component.customId;
    } else {
        chosenType = null
        await interaction.reply({embeds: [new EmojiEmbed()
            .setTitle("Create Ticket")
            .setEmoji("GUILD.TICKET.OPEN")
        ], ephemeral: true})
    }
    let overwrites = [{
        id: interaction.member,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"],
        type: "member"
    }] as Discord.OverwriteResolvable[];
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
        return await interaction.editReply({embeds: [new EmojiEmbed()
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
        let content = interaction.options.getString("message") || "";
        if (content) content = `**Message:**\n> ${content}\n`;
        await c.send({ embeds: [new EmojiEmbed()
            .setTitle("New Ticket")
            .setDescription(
                `Ticket created by <@${interaction.member.user.id}>\n` +
                `**Support type:** ${chosenType != null ? (getEmojiByName("TICKETS." + chosenType.toUpperCase()) + " " + capitalize(chosenType)) : "General"}\n` +
                `**Ticket ID:** \`${c.id}\`\n${content}\n` +
                `Type \`/ticket close\` to archive this ticket.`,
            )
            .setStatus("Success")
            .setEmoji("GUILD.TICKET.OPEN")
        ]})
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
                createdAt: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                ticketChannel: entry(c.id, renderChannel(c)),
            },
            hidden: {
                guild: interaction.guild.id
            }
        }
        log(data, interaction.client);
    } catch (e) { console.log(e)}
    await interaction.editReply({embeds: [new EmojiEmbed()
        .setTitle("Create Ticket")
        .setDescription(`Ticket created. You can view it here: <#${c.id}>`)
        .setStatus("Success")
        .setEmoji("GUILD.TICKET.OPEN")
    ], components: []});
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };