import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import humanizeDuration from 'humanize-duration';

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("slowmode")
    .setDescription("Manages slowmode in a channel")
    .addIntegerOption(option => option.setName("seconds").setDescription("The seconds between messages").setRequired(false))
    .addIntegerOption(option => option.setName("minutes").setDescription("The minutes between messages").setRequired(false))
    .addIntegerOption(option => option.setName("hours").setDescription("The hours between messages").setRequired(false))

const callback = (interaction: CommandInteraction) => {
    let seconds = interaction.option.getInteger("seconds")
    let minutes = interaction.option.getInteger("minutes")
    let hours = interaction.option.getInteger("hours")
    let totalTime = seconds + (minutes * 60) + (hours * 60 * 60)

    let confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.SLOWMODE.RED")
        .setTitle("Slowmode")
        .setDescription(keyValueList({
            "delay": `${totalTime ? humanizeDuration(totalTime * 1000) : "*No delay*"}`
        })
        + `Are you sure you want to enable slowmode in this channel?`)
        .setColor("Danger")
//        pluralize("day", interaction.options.getInteger("delete"))
//        const pluralize = (word: string, count: number) => { return count === 1 ? word : word + "s" }
    .send()
    if (confirmation.success) {
        try {
            await interaction.setRateLimitPerUser(totalTime, "Nucleus slowmode")
        } catch {
            return await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setEmoji("PUNISH.SLOWMODE.RED")
                .setTitle(`Slowmode`)
                .setDescription("Something went wrong and the slowmode could not be set.")
                .setStatus("Danger")
            ], components: []})
        }
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji("PUNISH.NICKNAME.GREEN")
            .setTitle(`Slowmode`)
            .setDescription("The channel slowmode was set successfully")
            .setStatus("Success")
        ], components: []})
    } else {
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji("PUNISH.SLOWMODE.GREEN")
            .setTitle(`Slowmode`)
            .setDescription("No changes were made")
            .setStatus("Success")
        ], components: []})
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as GuildMember)
    let me = (interaction.guild.me as GuildMember)
    // Check if Nucleus can edit the channel
    if (! me.permission.has("MANAGE_CHANNELS")) throw "I do not have permission to edit this channel"
    // Allow the owner to set any channel
    if (member.id == interaction.guild.ownerId) return true
    // Check if the user has manage_channels permission
    if (! member.permissions.has("MANAGE_CHANNELS")) throw "You do not have the `manage_channels` permission";
    // Allow slowmode
    return true
}

export { command, callback, check };