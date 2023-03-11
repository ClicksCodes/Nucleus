import Discord, {
    CommandInteraction,
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandSubcommandBuilder,
    ButtonInteraction
} from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import addPlurals from "../../utils/plurals.js";
import client from "../../utils/client.js";
import { LinkWarningFooter } from "../../utils/defaults.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("ban")
        .setDescription("Bans a user from the server")
        .addUserOption((option) => option.setName("user").setDescription("The user to ban").setRequired(true))
        .addNumberOption((option) =>
            option
                .setName("delete")
                .setDescription("Delete this number of days of messages from the user | Default: 0")
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        );

const callback = async (interaction: CommandInteraction | ButtonInteraction, member?: GuildMember): Promise<void> => {
    if (!interaction.guild) return;
    let deleteDays;
    if (!interaction.isButton()) {
        member = interaction.options.getMember("user") as GuildMember;
        deleteDays = (interaction.options.get("delete")?.value as number | null) ?? 0;
    } else {
        deleteDays = 0;
    }
    if (!member) return;
    const { renderUser } = client.logger;
    // TODO:[Modals] Replace the command arguments with a modal
    let reason = null;
    let notify = true;
    let confirmation;
    let chosen = false;
    let timedOut = false;
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.BAN.RED")
            .setTitle("Ban")
            .setDescription(
                keyValueList({
                    user: renderUser(member.user),
                    reason: reason ? "\n> " + reason.replaceAll("\n", "\n> ") : "*No reason provided*"
                }) +
                    `The user **will${notify ? "" : " not"}** be notified\n` +
                    `${addPlurals(deleteDays, "day")} of messages will be deleted\n\n` +
                    `Are you sure you want to ban <@!${member.id}>?`
            )
            .addCustomBoolean(
                "notify",
                "Notify user",
                false,
                undefined,
                "The user will be sent a DM",
                null,
                "ICONS.NOTIFY." + (notify ? "ON" : "OFF"),
                notify
            )
            .setColor("Danger")
            .addReasonButton(reason ?? "")
            .setFailedMessage("No changes were made", "Success", "PUNISH.BAN.GREEN")
            .send(reason !== null);
        reason = reason ?? "";
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) chosen = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) notify = confirmation.components["notify"]!.active;
    } while (!timedOut && !chosen);
    if (timedOut || !confirmation.success) return;
    reason = reason.length ? reason : null;
    let dmSent = false;
    let dmMessage;
    const config = await client.database.guilds.read(interaction.guild.id);
    try {
        if (notify) {
            if (reason) {
                reason = reason
                    .split("\n")
                    .map((line) => "> " + line)
                    .join("\n");
            }
            const messageData: {
                embeds: EmojiEmbed[];
                components: ActionRowBuilder<ButtonBuilder>[];
            } = {
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.BAN.RED")
                        .setTitle("Banned")
                        .setDescription(
                            `You have been banned from ${interaction.guild.name}` +
                                (reason ? ` for:\n${reason}` : ".\n*No reason was provided.*")
                        )
                        .setStatus("Danger")
                ],
                components: []
            };
            if (config.moderation.ban.text && config.moderation.ban.link) {
                messageData.embeds[0]!.setFooter(LinkWarningFooter);
                messageData.components.push(
                    new ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel(config.moderation.ban.text)
                            .setURL(config.moderation.ban.link.replaceAll("{id}", member.id))
                    )
                );
            }
            dmMessage = await member.send(messageData);
            dmSent = true;
        }
    } catch {
        dmSent = false;
    }
    try {
        await member.ban({
            deleteMessageSeconds: deleteDays * 24 * 60 * 60,
            reason: reason ?? "*No reason provided*"
        });
        await client.database.history.create("ban", interaction.guild.id, member.user, interaction.user, reason);
        const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
        const data = {
            meta: {
                type: "memberBan",
                displayName: "Member Banned",
                calculateType: "guildMemberPunish",
                color: NucleusColors.red,
                emoji: "PUNISH.BAN.RED",
                timestamp: Date.now()
            },
            list: {
                memberId: entry(member.user.id, `\`${member.user.id}\``),
                name: entry(member.user.id, renderUser(member.user)),
                banned: entry(Date.now().toString(), renderDelta(Date.now())),
                bannedBy: entry(interaction.user.id, renderUser(interaction.user)),
                reason: entry(reason, reason ? `\n> ${reason}` : "*No reason provided.*"),
                accountCreated: entry(member.user.createdTimestamp, renderDelta(member.user.createdTimestamp)),
                serverMemberCount: interaction.guild.memberCount
            },
            separate: {
                end:
                    getEmojiByName("ICONS.NOTIFY." + (notify ? "ON" : "OFF")) +
                    ` The user was ${notify ? "" : "not "}notified`
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        await log(data);
    } catch {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.BAN.RED")
                    .setTitle("Ban")
                    .setDescription("Something went wrong and the user was not banned")
                    .setStatus("Danger")
            ],
            components: []
        });
        if (dmSent && dmMessage) await dmMessage.delete();
        return;
    }
    const failed = !dmSent && notify;
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setEmoji(`PUNISH.BAN.${failed ? "YELLOW" : "GREEN"}`)
                .setTitle("Ban")
                .setDescription("The member was banned" + (failed ? ", but could not be notified" : ""))
                .setStatus(failed ? "Warning" : "Success")
        ],
        components: []
    });
};

const check = (interaction: CommandInteraction | ButtonInteraction, partial: boolean = false, target?: GuildMember) => {
    if (!interaction.guild) return;
    const member = interaction.member as GuildMember;
    // Check if the user has ban_members permission
    if (!member.permissions.has("BanMembers")) {
        // if(!partial) client.logger.warn("Missing permissions", "Ban", "User does not have Ban Members permission");
        return "You do not have the *Ban Members* permission";
    }
    if (partial) return true;
    const me = interaction.guild.members.me!;
    let apply: GuildMember;
    if (interaction.isButton()) {
        apply = target!;
    } else {
        apply = interaction.options.getMember("user") as GuildMember;
    }
    const memberPos = member.roles.cache.size > 1 ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size > 1 ? me.roles.highest.position : 0;
    const applyPos = apply.roles.cache.size > 1 ? apply.roles.highest.position : 0;
    // Do not allow banning the owner
    if (member.id === interaction.guild.ownerId) return "You cannot ban the owner of the server";
    // Check if Nucleus can ban the member
    if (!(mePos > applyPos)) return `I do not have a role higher than <@${apply.id}>`;
    // Check if Nucleus has permission to ban
    if (!me.permissions.has("BanMembers")) return "I do not have the *Ban Members* permission";
    // Do not allow banning Nucleus
    if (member.id === me.id) return "I cannot ban myself";
    // Allow the owner to ban anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) return `You do not have a role higher than <@${apply.id}>`;
    // Allow ban
    return true;
};

export { command, callback, check };
export const metadata = {
    longDescription:
        "Removes a member from the server - this will prevent them from rejoining until they are unbanned, and will delete a specified number of days of messages from them.",
    premiumOnly: true
};
