import { LinkWarningFooter, LoadingEmbed } from "../../utils/defaults.js";
import Discord, { CommandInteraction, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import client from "../../utils/client.js";
import { areTicketsEnabled, create } from "../../actions/createModActionTicket.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("mute")
        // .setNameLocalizations({"ru": "silence"})
        .setDescription("Mutes a member, stopping them from talking in the server")
        .addUserOption((option) => option.setName("user").setDescription("The user to mute").setRequired(true))
        .addIntegerOption((option) =>
            option
                .setName("days")
                .setDescription("The number of days to mute the user for | Default: 0")
                .setMinValue(0)
                .setMaxValue(27)
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName("hours")
                .setDescription("The number of hours to mute the user for | Default: 0")
                .setMinValue(0)
                .setMaxValue(23)
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName("minutes")
                .setDescription("The number of minutes to mute the user for | Default: 0")
                .setMinValue(0)
                .setMaxValue(59)
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName("seconds")
                .setDescription("The number of seconds to mute the user for | Default: 0")
                .setMinValue(0)
                .setMaxValue(59)
                .setRequired(false)
        );


const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const { log, NucleusColors, renderUser, entry, renderDelta } = client.logger;
    const member = interaction.options.getMember("user") as GuildMember;
    const time: {days: number, hours: number, minutes: number, seconds: number} = {
        days: (interaction.options.get("days")?.value as number | null) ?? 0,
        hours: (interaction.options.get("hours")?.value as number | null) ?? 0,
        minutes: (interaction.options.get("minutes")?.value as number | null) ?? 0,
        seconds: (interaction.options.get("seconds")?.value as number | null) ?? 0
    };
    const config = await client.database.guilds.read(interaction.guild.id);
    let serverSettingsDescription = config.moderation.mute.timeout ? "given a timeout" : "";
    if (config.moderation.mute.role)
        serverSettingsDescription +=
            (serverSettingsDescription ? " and " : "") + `given the <@&${config.moderation.mute.role}> role`;

    let muteTime = time.days * 24 * 60 * 60 + time.hours * 60 * 60 + time.minutes * 60 + time.seconds;
    if (muteTime === 0) {
        const m = await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.MUTE.GREEN")
                    .setTitle("Mute")
                    .setDescription("How long should the user be muted for?")
                    .setStatus("Success")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new Discord.ButtonBuilder().setCustomId("1m").setLabel("1 Minute").setStyle(ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId("10m").setLabel("10 Minutes").setStyle(ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId("30m").setLabel("30 Minutes").setStyle(ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId("1h").setLabel("1 Hour").setStyle(ButtonStyle.Secondary)
                ]),
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new Discord.ButtonBuilder().setCustomId("6h").setLabel("6 Hours").setStyle(ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId("12h").setLabel("12 Hours").setStyle(ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId("1d").setLabel("1 Day").setStyle(ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId("1w").setLabel("1 Week").setStyle(ButtonStyle.Secondary)
                ]),
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new Discord.ButtonBuilder()
                        .setCustomId("cancel")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                ])
            ],
            ephemeral: true,
            fetchReply: true
        });
        let component;
        try {
            component = await m.awaitMessageComponent({
                filter: (m) => m.user.id === interaction.user.id,
                time: 300000
            });
        } catch {
            return;
        }
        component.deferUpdate();
        if (component.customId === "cancel")
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.MUTE.RED")
                        .setTitle("Mute")
                        .setDescription("Mute cancelled")
                        .setStatus("Danger")
                ]
            });
        switch (component.customId) {
            case "1m": {
                muteTime = 60;
                break;
            }
            case "10m": {
                muteTime = 60 * 10;
                break;
            }
            case "30m": {
                muteTime = 60 * 30;
                break;
            }
            case "1h": {
                muteTime = 60 * 60;
                break;
            }
            case "6h": {
                muteTime = 60 * 60 * 6;
                break;
            }
            case "12h": {
                muteTime = 60 * 60 * 12;
                break;
            }
            case "1d": {
                muteTime = 60 * 60 * 24;
                break;
            }
            case "1w": {
                muteTime = 60 * 60 * 24 * 7;
                break;
            }
        }
    } else {
        await interaction.reply({
            embeds: LoadingEmbed,
            ephemeral: true,
            fetchReply: true
        });
    }
    // TODO:[Modals] Replace this with a modal
    let reason: string | null = null;
    let notify = true;
    let createAppealTicket = false;
    let confirmation;
    let timedOut = false;
    let success = false;
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.MUTE.RED")
            .setTitle("Mute")
            .setDescription(
                keyValueList({
                    user: renderUser(member.user),
                    time: `${humanizeDuration(muteTime * 1000, {
                        round: true
                    })}`,
                    reason: reason ? "\n> " + (reason).replaceAll("\n", "\n> ") : "*No reason provided*"
                }) +
                    "The user will be " +
                    serverSettingsDescription +
                    "\n\n" +
                    `Are you sure you want to mute <@!${member.id}>?`
            )
            .setColor("Danger")
            .addCustomBoolean(
                "appeal",
                "Create appeal ticket",
                !(await areTicketsEnabled(interaction.guild.id)),
                async () => await create(interaction.guild!, interaction.options.getUser("user")!, interaction.user, reason),
                "An appeal ticket will be created when Confirm is clicked",
                null,
                "CONTROL.TICKET",
                createAppealTicket
            )
            .addCustomBoolean(
                "notify",
                "Notify user",
                false,
                null,
                "The user will be sent a DM",
                null,
                "ICONS.NOTIFY." + (notify ? "ON" : "OFF"),
                notify
            )
            .addReasonButton(reason ?? "")
            .setFailedMessage("No changes were made", "Success", "PUNISH.MUTE.GREEN")
            .send(true);
        reason = reason ?? "";
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success) success = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) {
            notify = confirmation.components["notify"]!.active;
            createAppealTicket = confirmation.components["appeal"]!.active;
        }
    } while (!timedOut && !success)
    if (timedOut || !confirmation.success) return;
    const status: {timeout: boolean | null, role: boolean | null, dm: boolean | null} = {timeout: null, role: null, dm: null};
    let dmMessage;
    try {
        if (notify) {
            if (reason) { reason = reason.split("\n").map((line) => "> " + line).join("\n") }
            const messageData: {
                embeds: EmojiEmbed[];
                components: ActionRowBuilder<ButtonBuilder>[];
            } = {
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.MUTE.RED")
                        .setTitle("Muted")
                        .setDescription(
                            `You have been muted in ${interaction.guild.name}` +
                                (reason ? ` for:\n${reason}` : ".\n*No reason was provided*") + "\n\n" +
                            `You will be unmuted at: <t:${Math.round(new Date().getTime() / 1000) + muteTime}:D> at ` +
                            `<t:${Math.round(new Date().getTime() / 1000) + muteTime}:T> (<t:${Math.round(new Date().getTime() / 1000) + muteTime
                            }:R>)` + "\n\n" +
                            (createAppealTicket
                                ? `You can appeal this in the ticket created in <#${confirmation.components!["appeal"]!.response}>`
                                : "")
                        )
                        .setStatus("Danger")
                ],
                components: []
            }
            if (config.moderation.mute.text && config.moderation.mute.link) {
                messageData.embeds[0]!.setFooter(LinkWarningFooter);
                messageData.components.push(new ActionRowBuilder<Discord.ButtonBuilder>()
                    .addComponents(new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel(config.moderation.mute.text)
                        .setURL(config.moderation.mute.link)
                    )
                )
            };
            dmMessage = await member.send(messageData);
            status.dm = true;
        }
    } catch {
        status.dm = false;
    }
    try {
        if (config.moderation.mute.timeout) {
            await member.timeout(muteTime * 1000, reason || "*No reason provided*");
            if (config.moderation.mute.role !== null) {
                await member.roles.add(config.moderation.mute.role);
                await client.database.eventScheduler.schedule("naturalUnmute", (new Date().getTime() + muteTime * 1000).toString(), {
                    guild: interaction.guild.id,
                    user: member.id,
                    expires: new Date().getTime() + muteTime * 1000
                });
            }
        } else {
            status.timeout = true;
        }
    } catch {
        status.timeout = false;
    }
    try {
        if (config.moderation.mute.role !== null) {
            await member.roles.add(config.moderation.mute.role);
            await client.database.eventScheduler.schedule("unmuteRole", (new Date().getTime() + muteTime * 1000).toString(), {
                guild: interaction.guild.id,
                user: member.id,
                role: config.moderation.mute.role
            });
        } else {
            status.role = true;
        }
    } catch {
        status.role = false;
    }
    const countTrue = (items: (boolean | null)[]) => items.filter(item => item === true).length;
    const requiredPunishments = countTrue([config.moderation.mute.timeout, config.moderation.mute.role !== null]);
    const actualPunishments = countTrue([status.timeout, status.role]);

    await client.database.history.create("mute", interaction.guild.id, member.user, interaction.user, reason);
    if (requiredPunishments !== actualPunishments) {
        const messages = [];
        if (config.moderation.mute.timeout) messages.push(`The member was ${status.timeout ? "" : "not "}timed out`);
        if (config.moderation.mute.role !== null) messages.push(`The member was ${status.role ? "" : "not "}given the mute role`);
        messages.push(`The member was not sent a DM`);
        if (dmMessage && actualPunishments === 0) await dmMessage.delete();
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.MUTE." + (actualPunishments > 0 ? "YELLOW" : "RED"))
                    .setTitle("Mute")
                    .setDescription(
                        "Mute " + (actualPunishments > 0 ? "partially" : "failed") + ":\n" +
                        messages.map(message => `> ${message}`).join("\n")
                    )
                    .setStatus(actualPunishments > 0 ? "Warning" : "Danger")
            ],
            components: []
        });
    }
    const data = {
        meta: {
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
            mutedUntil: entry(
                (new Date().getTime() + muteTime * 1000).toString(),
                renderDelta(new Date().getTime() + muteTime * 1000)
            ),
            muted: entry(new Date().getTime.toString(), renderDelta(new Date().getTime() - 1000)),
            mutedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user as Discord.User)),
            reason: entry(reason, reason ? reason : "*No reason provided*")
        },
        hidden: {
            guild: interaction.guild.id
        }
    };
    log(data);
    const failed = !status.dm && notify;
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setEmoji(`PUNISH.MUTE.${failed ? "YELLOW" : "GREEN"}`)
                .setTitle("Mute")
                .setDescription(
                    "The member was muted" + (failed ? ", but could not be notified" : "") +
                    (createAppealTicket
                        ? ` and an appeal ticket was opened in <#${confirmation.components!["appeal"]!.response}>`
                        : "")
                )
                .setStatus(failed ? "Warning" : "Success")
        ],
        components: []
    });
};

const check = (interaction: CommandInteraction) => {
    if (!interaction.guild) return;
    const member = interaction.member as GuildMember;
    const me = interaction.guild.members.me!;
    const apply = interaction.options.getMember("user") as GuildMember;
    const memberPos = member.roles.cache.size > 1 ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size > 1 ? me.roles.highest.position : 0;
    const applyPos = apply.roles.cache.size > 1 ? apply.roles.highest.position : 0;
    // Do not allow muting the owner
    if (member.id === interaction.guild.ownerId) return "You cannot mute the owner of the server";
    // Check if Nucleus can mute the member
    if (!(mePos > applyPos)) return "I do not have a role higher than that member";
    // Check if Nucleus has permission to mute
    if (!me.permissions.has("ModerateMembers")) return "I do not have the *Moderate Members* permission";
    // Do not allow muting Nucleus
    if (member.id === me.id) return "I cannot mute myself";
    // Allow the owner to mute anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has moderate_members permission
    if (!member.permissions.has("ModerateMembers"))
        return "You do not have the *Moderate Members* permission";
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) return "You do not have a role higher than that member";
    // Allow mute
    return true;
};

export { command, callback, check };
