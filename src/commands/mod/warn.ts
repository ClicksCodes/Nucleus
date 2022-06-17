import Discord, { CommandInteraction, GuildMember, MessageActionRow } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import { create, areTicketsEnabled } from "../../automations/createModActionTicket.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("warn")
    .setDescription("Warns a user")
    .addUserOption(option => option.setName("user").setDescription("The user to warn").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the warn").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when they are warned | Default yes").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )

const callback = async (interaction: CommandInteraction): Promise<any> => {
    // @ts-ignore
    const { log, NucleusColors, renderUser, entry } = interaction.client.logger
    // TODO:[Modals] Replace this with a modal
    let confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.WARN.RED")
        .setTitle("Warn")
        .setDescription(keyValueList({
            "user": `<@!${(interaction.options.getMember("user") as GuildMember).id}> (${(interaction.options.getMember("user") as GuildMember).user.username})`,
            "reason": `\n> ${interaction.options.getString("reason") ? interaction.options.getString("reason") : "*No reason provided*"}`
        })
        + `The user **will${interaction.options.getString("notify") === "no" ? ' not' : ''}** be notified\n\n`
        + `Are you sure you want to warn <@!${(interaction.options.getMember("user") as GuildMember).id}>?`)
        .setColor("Danger")
        .addCustomBoolean(
            "Create appeal ticket", !(await areTicketsEnabled(interaction.guild.id)),
            async () => await create(interaction.guild, interaction.options.getUser("user"), interaction.user, interaction.options.getString("reason")),
            "An appeal ticket will be created when Confirm is clicked")
    .send()
    if (confirmation.success) {
        let dmd = false
        try {
            if (interaction.options.getString("notify") != "no") {
                await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new generateEmojiEmbed()
                        .setEmoji("PUNISH.WARN.RED")
                        .setTitle("Warned")
                        .setDescription(`You have been warned in ${interaction.guild.name}` +
                                    (interaction.options.getString("reason") ? ` for:\n> ${interaction.options.getString("reason")}` : ".") + "\n\n" +
                                    (confirmation.buttonClicked ? `You can appeal this here ticket: <#${confirmation.response}>` : ``))
                        .setStatus("Danger")
                    ]
                })
                dmd = true
            }
        } catch {
            await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setEmoji("PUNISH.WARN.RED")
                .setTitle(`Warn`)
                .setDescription("Something went wrong and the user was not warned")
                .setStatus("Danger")
            ], components: []})
        }
        let data = {
            meta:{
                type: 'memberWarn',
                displayName: 'Member warned',
                calculateType: 'guildMemberPunish',
                color: NucleusColors.yellow,
                emoji: 'PUNISH.WARN.YELLOW',
                timestamp: new Date().getTime()
            },
            list: {
                user: entry((interaction.options.getMember("user") as GuildMember).user.id, renderUser((interaction.options.getMember("user") as GuildMember).user)),
                warnedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                reason: (interaction.options.getString("reason") ? `\n> ${interaction.options.getString("reason")}` : "No reason provided")
            },
            hidden: {
                guild: interaction.guild.id
            }
        }
        log(data, interaction.client);
        let failed = (dmd == false && interaction.options.getString("notify") != "no")
        if (!failed) {
            await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setEmoji(`PUNISH.WARN.GREEN`)
                .setTitle(`Warn`)
                .setDescription("The user was warned" + (confirmation.response ? ` and an appeal ticket was opened in <#${confirmation.response}>` : ``))
                .setStatus("Success")
            ], components: []})
        } else {
            let m = await interaction.editReply({
                embeds: [new generateEmojiEmbed()
                    .setEmoji(`PUNISH.WARN.RED`)
                    .setTitle(`Warn`)
                    .setDescription("The user's DMs are not open\n\nWhat would you like to do?")
                    .setStatus("Danger")
                ], components: [
                    new MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("log")
                            .setLabel("Ignore and log")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("here")
                            .setLabel("Warn here")
                            .setStyle("SECONDARY")
                            .setDisabled((interaction.options.getMember("user") as GuildMember).permissionsIn(interaction.channel as Discord.TextChannel).has("VIEW_CHANNEL") === false),
                    ])
                ],
            })
            let component;
            try {
                component = await (m as Discord.Message).awaitMessageComponent({filter: (m) => m.user.id === interaction.user.id, time: 300000});
            } catch (e) {
                return await interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setEmoji(`PUNISH.WARN.GREEN`)
                    .setTitle(`Warn`)
                    .setDescription("No changes were made")
                    .setStatus("Success")
                ], components: []})
            }
            if ( component.customId == "here" ) {
                await interaction.channel.send({
                    embeds: [new generateEmojiEmbed()
                        .setEmoji(`PUNISH.WARN.RED`)
                        .setTitle(`Warn`)
                        .setDescription(`You have been warned` +
                                    (interaction.options.getString("reason") ? ` for:\n> ${interaction.options.getString("reason")}` : "."))
                        .setStatus("Danger")
                    ],
                    content: `<@!${(interaction.options.getMember("user") as GuildMember).id}>`,
                    allowedMentions: {users: [(interaction.options.getMember("user") as GuildMember).id]}
                })
                return await interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setEmoji(`PUNISH.WARN.GREEN`)
                    .setTitle(`Warn`)
                    .setDescription("The user was warned" + (confirmation.response ? ` and an appeal ticket was opened in <#${confirmation.response}>` : ``))
                    .setStatus("Success")
                ], components: []})
            } else {
                await interaction.editReply({embeds: [new generateEmojiEmbed()
                    .setEmoji(`PUNISH.WARN.GREEN`)
                    .setTitle(`Warn`)
                    .setDescription("The warn was logged")
                    .setStatus("Success")
                ], components: []})
            }
        }
    } else {
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji("PUNISH.WARN.GREEN")
            .setTitle(`Warn`)
            .setDescription("No changes were made")
            .setStatus("Success")
        ], components: []})
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as GuildMember)
    let me = (interaction.guild.me as GuildMember)
    let apply = (interaction.options.getMember("user") as GuildMember)
    if (member == null || me == null || apply == null) throw "That member is not in the server"
    let memberPos = member.roles ? member.roles.highest.position : 0
    let mePos = me.roles ? me.roles.highest.position : 0
    let applyPos = apply.roles ? apply.roles.highest.position : 0
    // Do not allow warning bots
    if (member.user.bot) throw "I cannot warn bots"
    // Allow the owner to warn anyone
    if (member.id == interaction.guild.ownerId) return true
    // Check if the user has moderate_members permission
    if (! member.permissions.has("MODERATE_MEMBERS")) throw "You do not have the `moderate_members` permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member"
    // Allow warn
    return true
}

export { command, callback, check };