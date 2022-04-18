import { CommandInteraction, GuildMember, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import readConfig from '../../utils/readConfig.js';
import { create, areTicketsEnabled } from "../../automations/createModActionTicket.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("nick")
    .setDescription("Changes a users nickname")
    .addUserOption(option => option.setName("user").setDescription("The user to change").setRequired(true))
    .addStringOption(option => option.setName("name").setDescription("The name to set | Leave blank to clear").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when their nickname is changed | Default no").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )

const callback = async (interaction: CommandInteraction) => {
    // TODO:[Modals] Replace this with a modal
    let confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.NICKNAME.RED")
        .setTitle("Nickname")
        .setDescription(keyValueList({
            "user": `<@!${(interaction.options.getMember("user") as GuildMember).id}> (${(interaction.options.getMember("user") as GuildMember).user.username})`,
            "new nickname": `${interaction.options.getString("name") ? interaction.options.getString("name") : "*No nickname*"}`
        })
        + `The user **will${interaction.options.getString("notify") == "yes" ? '' : ' not'}** be notified\n\n`
        + `Are you sure you want to ${interaction.options.getString("name") ? "change" : "clear"} <@!${(interaction.options.getMember("user") as GuildMember).id}>'s nickname?`)
        .setColor("Danger")
        .addCustomCallback(
            "Create appeal ticket", !(await areTicketsEnabled(interaction.guild.id)),
            () => { create(interaction.guild, interaction.options.getUser("user"), interaction.client)},
            "An appeal ticket was created")
//        pluralize("day", interaction.options.getInteger("delete"))
//        const pluralize = (word: string, count: number) => { return count === 1 ? word : word + "s" }
    .send()
    if (confirmation.success) {
        let dmd = false
        let dm;
        try {
            if (interaction.options.getString("notify") == "yes") {
                dm = await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new generateEmojiEmbed()
                        .setEmoji("PUNISH.NICKNAME.RED")
                        .setTitle("Nickname changed")
                        .setDescription(`Your nickname was ${interaction.options.getString("name") ? "changed" : "cleared"} in ${interaction.guild.name}` +
                                    (interaction.options.getString("name") ? ` it is now: ${interaction.options.getString("name")}` : ".") + "\n\n" +
                                    (confirmation.buttonClicked ? `You can appeal this in this ticket: <#${confirmation.response}>` : ``))
                        .setStatus("Danger")
                    ]
                })
                dmd = true
            }
        } catch {}
        try {
            (interaction.options.getMember("user") as GuildMember).setNickname(interaction.options.getString("name") ?? null, "Nucleus Nickname command")
        } catch {
            await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setEmoji("PUNISH.NICKNAME.RED")
                .setTitle(`Nickname`)
                .setDescription("Something went wrong and the users nickname could not be changed.")
                .setStatus("Danger")
            ], components: []})
            if (dmd) await dm.delete()
            return
        }
        let failed = (dmd == false && interaction.options.getString("notify") == "yes")
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji(`PUNISH.NICKNAME.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle(`Nickname`)
            .setDescription("The members nickname was changed" + (failed ? ", but was not notified" : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []})
    } else {
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji("PUNISH.NICKNAME.GREEN")
            .setTitle(`Nickname`)
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
    // Check if Nucleus can change the nickname
    if (! (mePos > applyPos)) throw "I do not have a role higher than that member"
    // Check if Nucleus has permission to change the nickname
    if (! interaction.guild.me.permissions.has("MANAGE_NICKNAMES")) throw "I do not have the `manage_nicknames` permission";
    // Allow the owner to change anyone's nickname
    if ((interaction.member as GuildMember).id == interaction.guild.ownerId) return true
    // Check if the user has manage_nicknames permission
    if (! (interaction.member as GuildMember).permissions.has("MANAGE_NICKNAMES")) throw "You do not have the `manage_nicknames` permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member"
    // Allow change
    return true
}

export { command, callback, check };