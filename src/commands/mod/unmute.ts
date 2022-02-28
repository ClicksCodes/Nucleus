import { CommandInteraction, GuildMember } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("unmute")
    .setDescription("Unmutes a user")
    .addUserOption(option => option.setName("user").setDescription("The user to unmute").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the unmute").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when they are unmuted | Default no").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )

const callback = async (interaction: CommandInteraction) => {
    // TODO:[Modals] Replace this with a modal
    if (await new confirmationMessage(interaction)
        .setEmoji("PUNISH.MUTE.RED")
        .setTitle("Unmute")
        .setDescription(keyValueList({
            "user": `<@!${(interaction.options.getMember("user") as GuildMember).id}> (${(interaction.options.getMember("user") as GuildMember).user.username})`,
            "reason": `\n> ${interaction.options.getString("reason") ? interaction.options.getString("reason") : "*No reason provided*"}`
        })
        + `The user **will${interaction.options.getString("notify") === "yes" ? '' : ' not'}** be notified\n\n`
        + `Are you sure you want to unmute <@!${(interaction.options.getMember("user") as GuildMember).id}>?`)
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
                        .setEmoji("PUNISH.MUTE.GREEN")
                        .setTitle("Unmuted")
                        .setDescription(`You have been unmuted in ${interaction.guild.name}` +
                                    (interaction.options.getString("reason") ? ` for:\n> ${interaction.options.getString("reason")}` : " with no reason provided."))
                        .setStatus("Success")
                    ]
                })
                dmd = true
            }
        } catch {}
        try {
            (interaction.options.getMember("user") as GuildMember).timeout(0, interaction.options.getString("reason") || "No reason provided")
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.MUTE.RED")
                .setTitle(`Unmute`)
                .setDescription("Something went wrong and the user was not unmuted")
                .setStatus("Danger")
            ], components: []})
            if (dmd) await dm.delete()
            return
        }
        let failed = (dmd == false && interaction.options.getString("notify") != "no")
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji(`PUNISH.MUTE.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle(`Unmute`)
            .setDescription("The member was unmuted" + (failed ? ", but could not be notified" : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []})
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.MUTE.GREEN")
            .setTitle(`Unmute`)
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
    // Check if Nucleus can unmute the member
    if (! (mePos > applyPos)) throw "I do not have a role higher than that member"
    // Check if Nucleus has permission to unmute
    if (! interaction.guild.me.permissions.has("MODERATE_MEMBERS")) throw "I do not have the `moderate_members` permission";
    // Do not allow the user to have admin or be the owner
    if ((interaction.options.getMember("user") as GuildMember).permissions.has("ADMINISTRATOR") || (interaction.options.getMember("user") as GuildMember).id == interaction.guild.ownerId) throw "You cannot unmute an admin or the owner"
    // Allow the owner to unmute anyone
    if ((interaction.member as GuildMember).id == interaction.guild.ownerId) return true
    // Check if the user has moderate_members permission
    if (! (interaction.member as GuildMember).permissions.has("MODERATE_MEMBERS")) throw "You do not have the `moderate_members` permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member"
    // Allow unmute
    return true
}

export { command, callback, check };