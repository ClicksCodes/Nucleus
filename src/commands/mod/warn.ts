import { CommandInteraction, GuildMember } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("warn")
    .setDescription("Warns a user")
    .addUserOption(option => option.setName("user").setDescription("The user to warn").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the warn").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when they are warned | Default yes").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]])
    )

const callback = async (interaction: CommandInteraction) => {
    // TODO:[Modals] Replace this with a modal
    if (await new confirmationMessage(interaction)
        .setEmoji("PUNISH.WARN.RED")
        .setTitle("Warn")
        .setDescription(keyValueList({
            "user": `<@!${(interaction.options.getMember("user") as GuildMember).id}> (${(interaction.options.getMember("user") as GuildMember).user.username})`,
            "reason": `\n> ${interaction.options.getString("reason") ? interaction.options.getString("reason") : "*No reason provided*"}`
        })
        + `The user **will${interaction.options.getString("notify") === "no" ? ' not' : ''}** be notified\n\n`)
        .setColor("Danger")
//        pluralize("day", interaction.options.getInteger("delete"))
//        const pluralize = (word: string, count: number) => { return count === 1 ? word : word + "s" }
    .send()) {
        let dmd = false
        try {
            if (interaction.options.getString("notify") != "no") {
                await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.RED")
                        .setTitle("Warned")
                        .setDescription(`You have been warned in ${interaction.guild.name}` +
                                    (interaction.options.getString("reason") ? ` for:\n> ${interaction.options.getString("reason")}` : " with no reason provided."))
                        .setStatus("Danger")
                    ]
                })
                dmd = true
            }
        } catch {}
        try {
            let failed = (dmd == false && interaction.options.getString("notify") != "no") // TODO: some way of dealing with not DMing users
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji(`PUNISH.WARN.${failed ? "YELLOW" : "GREEN"}`)
                .setTitle(`Warn`)
                .setDescription(failed ? "The user cannot be messaged and was not warned" : "The user was warned")
                .setStatus(failed ? "Warning" : "Success")
            ], components: []})
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.WARN.RED")
                .setTitle(`Warn`)
                .setDescription("Something went wrong and the user was not warned")
                .setStatus("Danger")
            ], components: []})
        }
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.WARN.GREEN")
            .setTitle(`Warn`)
            .setDescription("No changes were made")
            .setStatus("Success")
        ], components: []})
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    // Do not allow warning bots
    if ((interaction.member as GuildMember).user.bot) throw "I cannot warn bots"
    // Allow the owner to warn anyone
    if ((interaction.member as GuildMember).id == interaction.guild.ownerId) return true
    // Check if the user has moderate_members permission
    if (! (interaction.member as GuildMember).permissions.has("MODERATE_MEMBERS")) throw "You do not have the `moderate_members` permission";
    // Check if the user is below on the role list
    if (! ((interaction.member as GuildMember).roles.highest.position > (interaction.options.getMember("user") as GuildMember).roles.highest.position)) throw "You do not have a role higher than that member"
    // Allow warn
    return true
}

export { command, callback, check };