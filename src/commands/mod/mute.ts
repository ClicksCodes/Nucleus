import Discord, { CommandInteraction, GuildMember, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import humanizeDuration from "humanize-duration";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("mute")
    .setDescription("Mutes a member using Discord's \"Timeout\" feature")
    .addUserOption(option => option.setName("user").setDescription("The user to mute").setRequired(true))
    .addIntegerOption(option => option.setName("days").setDescription("The number of days to mute the user for | Default 0").setMinValue(0).setMaxValue(27).setRequired(false))
    .addIntegerOption(option => option.setName("hours").setDescription("The number of hours to mute the user for | Default 0").setMinValue(0).setMaxValue(23).setRequired(false))
    .addIntegerOption(option => option.setName("minutes").setDescription("The number of minutes to mute the user for | Default 0").setMinValue(0).setMaxValue(59).setRequired(false))
    .addIntegerOption(option => option.setName("seconds").setDescription("The number of seconds to mute the user for | Default 0").setMinValue(0).setMaxValue(59).setRequired(false))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the mute").setRequired(false))
    .addStringOption(option => option.setName("notify").setDescription("If the user should get a message when they are muted | Default yes").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]]))

const callback = async (interaction: CommandInteraction): Promise<any> => {
    const { log, NucleusColors, renderUser, entry } = client.logger
    const user = interaction.options.getMember("user") as GuildMember
    const reason = interaction.options.getString("reason")
    const time = {
        days: interaction.options.getInteger("days") || 0,
        hours: interaction.options.getInteger("hours") || 0,
        minutes: interaction.options.getInteger("minutes") || 0,
        seconds: interaction.options.getInteger("seconds") || 0
    }
    let config = await client.database.guilds.read(interaction.guild.id)
    let serverSettingsDescription = (config.moderation.mute.timeout ? "given a timeout" : "")
    if (config.moderation.mute.role) serverSettingsDescription += (serverSettingsDescription ? " and " : "") + `given the <@&${config.moderation.mute.role}> role`

    let muteTime = (time.days * 24 * 60 * 60) + (time.hours * 60 * 60) + (time.minutes * 60) + time.seconds
    if (muteTime == 0) {
        let m = await interaction.reply({embeds: [
            new EmojiEmbed()
                .setEmoji("PUNISH.MUTE.GREEN")
                .setTitle("Mute")
                .setDescription("How long should the user be muted")
                .setStatus("Success")
        ], components: [
            new MessageActionRow().addComponents([
                new Discord.MessageButton()
                    .setCustomId("1m")
                    .setLabel("1 Minute")
                    .setStyle("SECONDARY"),
                new Discord.MessageButton()
                    .setCustomId("10m")
                    .setLabel("10 Minutes")
                    .setStyle("SECONDARY"),
                new Discord.MessageButton()
                    .setCustomId("30m")
                    .setLabel("30 Minutes")
                    .setStyle("SECONDARY"),
                new Discord.MessageButton()
                    .setCustomId("1h")
                    .setLabel("1 Hour")
                    .setStyle("SECONDARY")
            ]),
            new MessageActionRow().addComponents([
                new Discord.MessageButton()
                    .setCustomId("6h")
                    .setLabel("6 Hours")
                    .setStyle("SECONDARY"),
                new Discord.MessageButton()
                    .setCustomId("12h")
                    .setLabel("12 Hours")
                    .setStyle("SECONDARY"),
                new Discord.MessageButton()
                    .setCustomId("1d")
                    .setLabel("1 Day")
                    .setStyle("SECONDARY"),
                new Discord.MessageButton()
                    .setCustomId("1w")
                    .setLabel("1 Week")
                    .setStyle("SECONDARY")
            ]),
            new MessageActionRow().addComponents([
                new Discord.MessageButton()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle("DANGER")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
            ])
        ], ephemeral: true, fetchReply: true})
        let component;
        try {
            component = await (m as Discord.Message).awaitMessageComponent({filter: (m) => m.user.id === interaction.user.id, time: 300000});
        } catch { return }
        component.deferUpdate();
        if (component.customId == "cancel") return interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.MUTE.RED")
            .setTitle("Mute")
            .setDescription("Mute cancelled")
            .setStatus("Danger")
        ]})
        switch (component.customId) {
            case "1m": { muteTime = 60; break; }
            case "10m": { muteTime = 60 * 10; break; }
            case "30m": { muteTime = 60 * 30; break; }
            case "1h": { muteTime = 60 * 60; break; }
            case "6h": { muteTime = 60 * 60 * 6; break; }
            case "12h": { muteTime = 60 * 60 * 12; break; }
            case "1d": { muteTime = 60 * 60 * 24; break; }
            case "1w": { muteTime = 60 * 60 * 24 * 7; break; }
        }
    } else {
        await interaction.reply({embeds: [
            new EmojiEmbed()
                .setEmoji("PUNISH.MUTE.GREEN")
                .setTitle("Mute")
                .setDescription("Loading...")
                .setStatus("Success")
        ], ephemeral: true, fetchReply: true})
    }
    // TODO:[Modals] Replace this with a modal
    let confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.MUTE.RED")
        .setTitle("Mute")
        .setDescription(keyValueList({
            "user": renderUser(user),
            "time": `${humanizeDuration(muteTime * 1000, {round: true})}`,
            "reason": `\n> ${reason ? reason : "*No reason provided*"}`
        })
        + `The user will be ` + serverSettingsDescription + "\n"
        + `The user **will${interaction.options.getString("notify") === "no" ? ' not' : ''}** be notified\n\n`
        + `Are you sure you want to mute <@!${(interaction.options.getMember("user") as GuildMember).id}>?`)
        .setColor("Danger")
    .send(true)
    if (confirmation.success) {
        let dmd = false
        let dm;
        let config = await client.database.guilds.read(interaction.guild.id);
        try {
            if (interaction.options.getString("notify") != "no") {
                dm = await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.MUTE.RED")
                        .setTitle("Muted")
                        .setDescription(`You have been muted in ${interaction.guild.name}` +
                                    (interaction.options.getString("reason") ? ` for:\n> ${interaction.options.getString("reason")}` : ".\n\n" +
                                    `You will be unmuted at: <t:${Math.round((new Date).getTime() / 1000) + muteTime}:D> at <t:${Math.round((new Date).getTime() / 1000) + muteTime}:T> (<t:${Math.round((new Date).getTime() / 1000) + muteTime}:R>)`))
                        .setStatus("Danger")
                    ],
                    components: [new MessageActionRow().addComponents(config.moderation.mute.text ? [new MessageButton()
                        .setStyle("LINK")
                        .setLabel(config.moderation.mute.text)
                        .setURL(config.moderation.mute.link)
                    ] : [])]
                })
                dmd = true
            }
        } catch {}
        let member = (interaction.options.getMember("user") as GuildMember)
        try {
            if (config.moderation.mute.timeout) {
                member.timeout(muteTime * 1000, interaction.options.getString("reason") || "No reason provided")
            }
            if (config.moderation.mute.role) {
                member.roles.add(config.moderation.mute.role)
            } // make sure this gets removed
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.MUTE.RED")
                .setTitle(`Mute`)
                .setDescription("Something went wrong and the user was not mute")
                .setStatus("Danger")
            ], components: []})
            if (dmd) await dm.delete()
            return
        }
        try { await client.database.history.create("mute", interaction.guild.id, member.user, interaction.user, reason) } catch {}
        let failed = (dmd == false && interaction.options.getString("notify") != "no")
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji(`PUNISH.MUTE.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle(`Mute`)
            .setDescription("The member was muted" + (failed ? ", but could not be notified" : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []})
        let data = {
            meta:{
                type: 'memberMute',
                displayName: 'Member Muted',
                calculateType: 'guildMemberPunish',
                color: NucleusColors.yellow,
                emoji: 'PUNISH.WARN.YELLOW',
                timestamp: new Date().getTime()
            },
            list: {
                user: entry(member.user.id, renderUser(member.user)),
                mutedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                time: entry(muteTime, `${humanizeDuration(muteTime * 1000, {round: true})}`),
                reason: (interaction.options.getString("reason") ? `\n> ${interaction.options.getString("reason")}` : "No reason provided")
            },
            hidden: {
                guild: interaction.guild.id
            }
        }
        log(data);
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.MUTE.GREEN")
            .setTitle(`Mute`)
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
    // Check if Nucleus can mute the member
    if (! (mePos > applyPos)) throw "I do not have a role higher than that member"
    // Check if Nucleus has permission to mute
    if (! me.permissions.has("MODERATE_MEMBERS")) throw "I do not have the Moderate members permission";
    // Do not allow the user to have admin or be the owner
    if (apply.permissions.has("ADMINISTRATOR") || (interaction.options.getMember("user") as GuildMember).id == interaction.guild.ownerId) throw "You cannot mute an admin or the owner"
    // Do not allow muting Nucleus
    if (member.id == me.id) throw "I cannot mute myself"
    // Allow the owner to mute anyone
    if (member.id == interaction.guild.ownerId) return true
    // Check if the user has moderate_members permission
    if (! member.permissions.has("MODERATE_MEMBERS")) throw "You do not have the Moderate members permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member"
    // Allow mute
    return true
}

export { command, callback, check };