import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import Discord, { CommandInteraction, GuildMember, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import humanizeDuration from "humanize-duration";
import client from "../../utils/client.js";
import { areTicketsEnabled, create } from "../../actions/createModActionTicket.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("mute")
        .setDescription("Mutes a member, stopping them from talking in the server")
        .addUserOption(option => option.setName("user").setDescription("The user to mute").setRequired(true))
        .addIntegerOption(option => option.setName("days").setDescription("The number of days to mute the user for | Default: 0").setMinValue(0).setMaxValue(27).setRequired(false))
        .addIntegerOption(option => option.setName("hours").setDescription("The number of hours to mute the user for | Default: 0").setMinValue(0).setMaxValue(23).setRequired(false))
        .addIntegerOption(option => option.setName("minutes").setDescription("The number of minutes to mute the user for | Default: 0").setMinValue(0).setMaxValue(59).setRequired(false))
        .addIntegerOption(option => option.setName("seconds").setDescription("The number of seconds to mute the user for | Default: 0").setMinValue(0).setMaxValue(59).setRequired(false));

const callback = async (interaction: CommandInteraction): Promise<any> => {
    const { log, NucleusColors, renderUser, entry, renderDelta } = client.logger;
    const user = interaction.options.getMember("user") as GuildMember;
    const time = {
        days: interaction.options.getInteger("days") || 0,
        hours: interaction.options.getInteger("hours") || 0,
        minutes: interaction.options.getInteger("minutes") || 0,
        seconds: interaction.options.getInteger("seconds") || 0
    };
    const config = await client.database.guilds.read(interaction.guild.id);
    let serverSettingsDescription = (config.moderation.mute.timeout ? "given a timeout" : "");
    if (config.moderation.mute.role) serverSettingsDescription += (serverSettingsDescription ? " and " : "") + `given the <@&${config.moderation.mute.role}> role`;

    let muteTime = (time.days * 24 * 60 * 60) + (time.hours * 60 * 60) + (time.minutes * 60) + time.seconds;
    if (muteTime === 0) {
        const m = await interaction.reply({embeds: [
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
        ], ephemeral: true, fetchReply: true});
        let component;
        try {
            component = await (m as Discord.Message).awaitMessageComponent({filter: (m) => m.user.id === interaction.user.id, time: 300000});
        } catch { return; }
        component.deferUpdate();
        if (component.customId === "cancel") return interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.MUTE.RED")
            .setTitle("Mute")
            .setDescription("Mute cancelled")
            .setStatus("Danger")
        ]});
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
        await interaction.reply({embeds: LoadingEmbed, ephemeral: true, fetchReply: true});
    }
    // TODO:[Modals] Replace this with a modal
    let reason = null;
    let notify = true;
    let createAppealTicket = false;
    let confirmation;
    while (true) {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.MUTE.RED")
            .setTitle("Mute")
            .setDescription(keyValueList({
                "user": renderUser(user.user),
                "time": `${humanizeDuration(muteTime * 1000, {round: true})}`,
                "reason": reason ?  ("\n> " + ((reason ?? "").replaceAll("\n", "\n> "))) : "*No reason provided*"
            })
            + "The user will be " + serverSettingsDescription + "\n"
            + `The user **will${notify ? "" : " not"}** be notified\n\n`
            + `Are you sure you want to mute <@!${user.id}>?`)
            .setColor("Danger")
            .addCustomBoolean(
                "appeal", "Create appeal ticket", !(await areTicketsEnabled(interaction.guild.id)),
                async () => await create(interaction.guild, interaction.options.getUser("user"), interaction.user, reason),
                "An appeal ticket will be created when Confirm is clicked", "CONTROL.TICKET", createAppealTicket)
            .addCustomBoolean("notify", "Notify user", false, null, null, "ICONS.NOTIFY." + (notify ? "ON" : "OFF" ), notify)
            .addReasonButton(reason ?? "")
            .send(true);
        reason = reason ?? "";
        if (confirmation.cancelled) return;
        if (confirmation.success) break;
        if (confirmation.newReason) reason = confirmation.newReason;
        if (confirmation.components) {
            notify = confirmation.components.notify.active;
            createAppealTicket = confirmation.components.appeal.active;
        }
    }
    if (confirmation.success) {
        let dmd = false;
        let dm;
        const config = await client.database.guilds.read(interaction.guild.id);
        try {
            if (notify) {
                dm = await user.send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.MUTE.RED")
                        .setTitle("Muted")
                        .setDescription(`You have been muted in ${interaction.guild.name}` +
                                    (reason ? ` for:\n> ${reason}` : ".\n\n" +
                                    `You will be unmuted at: <t:${Math.round((new Date).getTime() / 1000) + muteTime}:D> at <t:${Math.round((new Date).getTime() / 1000) + muteTime}:T> (<t:${Math.round((new Date).getTime() / 1000) + muteTime}:R>)`) +
                                    (confirmation.components.appeal.response ? `You can appeal this here: <#${confirmation.components.appeal.response}>` : ""))
                        .setStatus("Danger")
                    ],
                    components: [new MessageActionRow().addComponents(config.moderation.mute.text ? [new MessageButton()
                        .setStyle("LINK")
                        .setLabel(config.moderation.mute.text)
                        .setURL(config.moderation.mute.link)
                    ] : [])]
                });
                dmd = true;
            }
        } catch { dmd = false; }
        const member = user;
        let errors = 0;
        try {
            if (config.moderation.mute.timeout) {
                await member.timeout(muteTime * 1000, reason || "No reason provided");
                if (config.moderation.mute.role !== null) {
                    await member.roles.add(config.moderation.mute.role);
                    await client.database.eventScheduler.schedule("naturalUnmute", new Date().getTime() + muteTime * 1000, {
                        guild: interaction.guild.id,
                        user: user.id,
                        expires: new Date().getTime() + muteTime * 1000
                    });
                }
            }
        } catch { errors++; }
        try {
            if (config.moderation.mute.role !== null) {
                await member.roles.add(config.moderation.mute.role);
                await client.database.eventScheduler.schedule("unmuteRole", new Date().getTime() + muteTime * 1000, {
                    guild: interaction.guild.id,
                    user: user.id,
                    role: config.moderation.mute.role
                });
            }
        } catch (e){ console.log(e); errors++; }
        if (errors === 2) {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.MUTE.RED")
                .setTitle("Mute")
                .setDescription("Something went wrong and the user was not muted")
                .setStatus("Danger")
            ], components: []}); // TODO: make this clearer
            if (dmd) await dm.delete();
            return;
        }
        await client.database.history.create("mute", interaction.guild.id, member.user, interaction.user, reason);
        const failed = (dmd === false && notify);
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji(`PUNISH.MUTE.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle("Mute")
            .setDescription("The member was muted" + (failed ? ", but could not be notified" : "") + (confirmation.components.appeal.response ? ` and an appeal ticket was opened in <#${confirmation.components.appeal.response}>` : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []});
        const data = {
            meta:{
                type: "memberMute",
                displayName: "Member Muted",
                calculateType: "guildMemberPunish",
                color: NucleusColors.yellow,
                emoji: "PUNISH.WARN.YELLOW",
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(member.user.id, `\`${member.user.id}\``),
                name: entry(member.user.id, renderUser(member.user)),
                mutedUntil: entry(new Date().getTime() + muteTime * 1000, renderDelta(new Date().getTime() + muteTime * 1000)),
                muted: entry(new Date().getTime(), renderDelta(new Date().getTime() - 1000)),
                mutedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                reason: entry(reason, reason ? reason : "*No reason provided*")
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.MUTE.GREEN")
            .setTitle("Mute")
            .setDescription("No changes were made")
            .setStatus("Success")
        ], components: []});
    }
};

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    const member = (interaction.member as GuildMember);
    const me = (interaction.guild.me as GuildMember);
    const apply = (interaction.options.getMember("user") as GuildMember);
    if (member === null || me === null || apply === null) throw "That member is not in the server";
    const memberPos = member.roles ? member.roles.highest.position : 0;
    const mePos = me.roles ? me.roles.highest.position : 0;
    const applyPos = apply.roles ? apply.roles.highest.position : 0;
    // Do not allow muting the owner
    if (member.id === interaction.guild.ownerId) throw "You cannot mute the owner of the server";
    // Check if Nucleus can mute the member
    if (! (mePos > applyPos)) throw "I do not have a role higher than that member";
    // Check if Nucleus has permission to mute
    if (! me.permissions.has("MODERATE_MEMBERS")) throw "I do not have the *Moderate Members* permission";
    // Do not allow muting Nucleus
    if (member.id === me.id) throw "I cannot mute myself";
    // Allow the owner to mute anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has moderate_members permission
    if (! member.permissions.has("MODERATE_MEMBERS")) throw "You do not have the *Moderate Members* permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member";
    // Allow mute
    return true;
};

export { command, callback, check };