import { CommandInteraction, GuildMember } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("softban")
    .setDescription("Kicks a user and deletes their messages")
    .addUserOption(option => option.setName("user").setDescription("The user to softban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the softban").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when they are banbanned | Default yes").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )
    .addIntegerOption(option => option.setName("delete").setDescription("The days of messages to delete | Default 0").setMinValue(0).setMaxValue(7).setRequired(false))

const callback = async (interaction: CommandInteraction) => {
    // TODO:[Modals] Replace this with a modal
    if (await new confirmationMessage(interaction)
        .setEmoji("PUNISH.BAN.RED")
        .setTitle("Softban")
        .setDescription(keyValueList({
            "user": `<@!${(interaction.options.getMember("user") as GuildMember).id}> (${(interaction.options.getMember("user") as GuildMember).user.username})`,
            "reason": `\n> ${interaction.options.getString("reason") ? interaction.options.getString("reason") : "*No reason provided*"}`
        })
        + `The user **will${interaction.options.getString("notify") === "no" ? ' not' : ''}** be notified\n`
        + `${interaction.options.getInteger("delete") ? interaction.options.getInteger("delete") : 0} day${interaction.options.getInteger("delete") === 1 || interaction.options.getInteger("delete") === null ? "s" : ""} of messages will be deleted\n\n` // TODO:[s addition]
        + `Are you sure you want to softban <@!${(interaction.options.getMember("user") as GuildMember).id}>?`)
        .setColor("Danger")
//        pluralize("day", interaction.options.getInteger("delete"))
//        const pluralize = (word: string, count: number) => { return count === 1 ? word : word + "s" }
    .send()) {
        let dmd = false
        try {
            if (interaction.options.getString("notify") != "no") {
                await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.BAN.RED")
                        .setTitle("Kick")
                        .setDescription(`You have been kicked from ${interaction.guild.name}` +
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
                reason: interaction.options.getString("reason")
            }) // TODO: unban here
            let failed = (dmd == false && interaction.options.getString("notify") != "no")
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji(`PUNISH.BAN.${failed ? "YELLOW" : "GREEN"}`)
                .setTitle(`Softban`)
                .setDescription("The member was softbanned" + (failed ? ", but could not be notified" : ""))
                .setStatus(failed ? "Warning" : "Success")
            ], components: []})
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.BAN.RED")
                .setTitle(`Softban`)
                .setDescription("Something went wrong and the user was not softbanned")
                .setStatus("Danger")
            ], components: []})
        }
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
    // Check if Nucleus can ban the member
    if (! (interaction.guild.me.roles.highest.position > (interaction.member as GuildMember).roles.highest.position)) throw "I do not have a role higher than that member"
    // Check if Nucleus has permission to ban
    if (! interaction.guild.me.permissions.has("BAN_MEMBERS")) throw "I do not have the `ban_members` permission";
    // Do not allow softbanning Nucleus
    if ((interaction.member as GuildMember).id == interaction.guild.me.id) throw "I cannot softban myself"
    // Allow the owner to ban anyone
    if ((interaction.member as GuildMember).id == interaction.guild.ownerId) return true
    // Check if the user has ban_members permission
    if (! (interaction.member as GuildMember).permissions.has("BAN_MEMBERS")) throw "You do not have the `ban_members` permission";
    // Check if the user is below on the role list
    if (! ((interaction.member as GuildMember).roles.highest.position > (interaction.options.getMember("user") as GuildMember).roles.highest.position)) throw "You do not have a role higher than that member"
    // Allow softban
    return true
}

export { command, callback, check };