import { CommandInteraction, GuildMember, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";
import addPlural from "../../utils/plurals.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("softban")
    .setDescription("Kicks a user and deletes their messages")
    .addUserOption(option => option.setName("user").setDescription("The user to softban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the softban").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when they are softbanned | Default yes").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )
    .addIntegerOption(option => option.setName("delete").setDescription("The days of messages to delete | Default 0").setMinValue(0).setMaxValue(7).setRequired(false))

const callback = async (interaction: CommandInteraction): Promise<any> => {
    const { renderUser } = client.logger
    // TODO:[Modals] Replace this with a modal
    let confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.BAN.RED")
        .setTitle("Softban")
        .setDescription(keyValueList({
            "user": renderUser(interaction.options.getUser("user")),
            "reason": `\n> ${interaction.options.getString("reason") ? interaction.options.getString("reason") : "*No reason provided*"}`
        })
        + `The user **will${interaction.options.getString("notify") === "no" ? ' not' : ''}** be notified\n`
        + `${addPlural(interaction.options.getInteger("delete") ? interaction.options.getInteger("delete") : 0, "day")} of messages will be deleted\n\n`
        + `Are you sure you want to softban <@!${(interaction.options.getMember("user") as GuildMember).id}>?`)
        .setColor("Danger")
    .send()
    if (confirmation.success) {
        let dmd = false;
        let config = await client.database.guilds.read(interaction.guild.id);
        try {
            if (interaction.options.getString("notify") != "no") {
                await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.BAN.RED")
                        .setTitle("Softbanned")
                        .setDescription(`You have been softbanned from ${interaction.guild.name}` +
                                    (interaction.options.getString("reason") ? ` for:\n> ${interaction.options.getString("reason")}` : "."))
                        .setStatus("Danger")
                    ],
                    components: [new MessageActionRow().addComponents(config.moderation.ban.text ? [new MessageButton()
                        .setStyle("LINK")
                        .setLabel(config.moderation.ban.text)
                        .setURL(config.moderation.ban.link)
                    ] : [])]
                })
                dmd = true
            }
        } catch {}
        let member = (interaction.options.getMember("user") as GuildMember)
        try {
            await member.ban({
                days: Number(interaction.options.getInteger("delete") ?? 0),
                reason: interaction.options.getString("reason")
            });
            await interaction.guild.members.unban(member, "Softban");
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.BAN.RED")
                .setTitle(`Softban`)
                .setDescription("Something went wrong and the user was not softbanned")
                .setStatus("Danger")
            ], components: []})
        }
        try { await client.database.history.create("softban", interaction.guild.id, member.user, interaction.options.getString("reason")) } catch {}
        let failed = (dmd == false && interaction.options.getString("notify") != "no")
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji(`PUNISH.BAN.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle(`Softban`)
            .setDescription("The member was softbanned" + (failed ? ", but could not be notified" : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []})
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.BAN.GREEN")
            .setTitle(`Softban`)
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
    // Check if Nucleus can ban the member
    if (! (mePos > applyPos)) throw "I do not have a role higher than that member"
    // Check if Nucleus has permission to ban
    if (!me.permissions.has("BAN_MEMBERS")) throw "I do not have the Ban members permission";
    // Do not allow softbanning Nucleus
    if (member.id == me.id) throw "I cannot softban myself"
    // Allow the owner to ban anyone
    if (member.id == interaction.guild.ownerId) return true
    // Check if the user has ban_members permission
    if (! member.permissions.has("BAN_MEMBERS")) throw "You do not have the Ban members permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member"
    // Allow softban
    return true
}

export { command, callback, check };