import { CommandInteraction, GuildMember } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("ban")
    .setDescription("Bans a user from the server")
    .addUserOption(option => option.setName("user").setDescription("The user to ban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the ban").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when they are banned | Default yes").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )
    .addIntegerOption(option => option.setName("delete").setDescription("The days of messages to delete | Default 0").setMinValue(0).setMaxValue(7).setRequired(false))

const callback = async (interaction: CommandInteraction) => {
    // TODO:[Modals] Replace this with a modal
    if (await new confirmationMessage(interaction)
        .setEmoji("PUNISH.BAN.RED")
        .setTitle("Ban")
        .setDescription(keyValueList({
            "user": `<@!${(interaction.options.getMember("user") as GuildMember).id}> (${(interaction.options.getMember("user") as GuildMember).user.username})`,
            "reason": `\n> ${interaction.options.getString("reason") ? interaction.options.getString("reason") : "*No reason provided*"}`
        })
        + `The user **will${interaction.options.getString("notify") === "no" ? ' not' : ''}** be notified\n`
        + `${interaction.options.getInteger("delete") ? interaction.options.getInteger("delete") : 0} day${interaction.options.getInteger("delete") === 1 || interaction.options.getInteger("delete") === null ? "s" : ""} of messages will be deleted\n\n` // TODO:[s addition]
        + `Are you sure you want to ban <@!${(interaction.options.getMember("user") as GuildMember).id}>?`)
        .setColor("Danger")
//        pluralize("day", interaction.options.getInteger("delete"))
//        const pluralize = (word: string, count: number) => { return count === 1 ? word : word + "s" }
    .send()) {
        let dmd = false
        let dm;
        try {
            if (interaction.options.getString("notify") != "no") {
                dm = await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.BAN.RED")
                        .setTitle("Banned")
                        .setDescription(`You have been banned in ${interaction.guild.name}` +
                                    (interaction.options.getString("reason") ? ` for:\n> ${interaction.options.getString("reason")}` : " with no reason provided."))
                        .setStatus("Danger")
                    ]
                })
                dmd = true
            }
        } catch {}
        try {
            (interaction.options.getMember("user") as GuildMember).ban({
                days: Number(interaction.options.getInteger("delete") ?? 0),
                reason: interaction.options.getString("reason") ?? "No reason provided"
            })
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.BAN.RED")
                .setTitle(`Ban`)
                .setDescription("Something went wrong and the user was not banned")
                .setStatus("Danger")
            ], components: []})
            if (dmd) await dm.delete()
            return
        }
        let failed = (dmd == false && interaction.options.getString("notify") != "no")
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji(`PUNISH.BAN.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle(`Ban`)
            .setDescription("The member was banned" + (failed ? ", but could not be notified" : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []})
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.BAN.GREEN")
            .setTitle(`Ban`)
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
    if (! interaction.guild.me.permissions.has("BAN_MEMBERS")) throw "I do not have the `ban_members` permission";
    // Do not allow banning Nucleus
    if ((interaction.member as GuildMember).id == interaction.guild.me.id) throw "I cannot ban myself"
    // Allow the owner to ban anyone
    if ((interaction.member as GuildMember).id == interaction.guild.ownerId) return true
    // Check if the user has ban_members permission
    if (! (interaction.member as GuildMember).permissions.has("BAN_MEMBERS")) throw "You do not have the `ban_members` permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member"
    // Allow ban
    return true
}

export { command, callback, check };