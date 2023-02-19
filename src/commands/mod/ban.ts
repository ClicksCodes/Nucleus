import Discord, { CommandInteraction, GuildMember, ActionRowBuilder, ButtonBuilder, User, ButtonStyle, SlashCommandSubcommandBuilder } from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import addPlurals from "../../utils/plurals.js";
import client from "../../utils/client.js";
import { LinkWarningFooter } from "../../utils/defaults.js";


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


const callback = async (interaction: CommandInteraction): Promise<void> => {
    if (!interaction.guild) return;
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
                    user: renderUser(interaction.options.getUser("user")!),
                    reason: reason ? "\n> " + (reason).replaceAll("\n", "\n> ") : "*No reason provided*"
                }) +
                    `The user **will${notify ? "" : " not"}** be notified\n` +
                    `${addPlurals(
                        (interaction.options.get("delete")?.value as number | null) ?? 0, "day")
                    } of messages will be deleted\n\n` +
                    `Are you sure you want to ban <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
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
    } while (!timedOut && !chosen)
    if (timedOut || !confirmation.success) return;
    reason = reason.length ? reason : null
    let dmSent = false;
    let dmMessage;
    const config = await client.database.guilds.read(interaction.guild.id);
    try {
        if (notify) {
            if (reason) { reason = reason.split("\n").map((line) => "> " + line).join("\n") }
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
                messageData.embeds[0]!.setFooter(LinkWarningFooter)
                messageData.components.push(new ActionRowBuilder<Discord.ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel(config.moderation.ban.text)
                            .setURL(config.moderation.ban.link.replaceAll("{id}", (interaction.options.getMember("user") as GuildMember).id))
                        )
                )
            }
            dmMessage = await (interaction.options.getMember("user") as GuildMember).send(messageData);
            dmSent = true;
        }
    } catch {
        dmSent = false;
    }
    try {
        const member = interaction.options.getMember("user") as GuildMember;
        const days: number = interaction.options.get("delete")?.value as number | null ?? 0;
        member.ban({
            deleteMessageSeconds: days * 24 * 60 * 60,
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
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(member.user.id, `\`${member.user.id}\``),
                name: entry(member.user.id, renderUser(member.user)),
                banned: entry(new Date().getTime().toString(), renderDelta(new Date().getTime())),
                bannedBy: entry(interaction.user.id, renderUser(interaction.user)),
                reason: entry(reason, reason ? `\n> ${reason}` : "*No reason provided.*"),
                accountCreated: entry(member.user.createdTimestamp, renderDelta(member.user.createdTimestamp)),
                serverMemberCount: interaction.guild.memberCount
            },
            hidden: {
                guild: interaction.guild.id
            }
        };
        log(data);
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

const check = async (interaction: CommandInteraction, partial: boolean = false) => {
    if (!interaction.guild) return;
    const member = interaction.member as GuildMember;
    // Check if the user has ban_members permission
    if (!member.permissions.has("BanMembers")) return "You do not have the *Ban Members* permission";
    if(partial) return true;
    const me = interaction.guild.members.me!;
    let apply = interaction.options.getUser("user") as User | GuildMember;
    const memberPos = member.roles.cache.size > 1 ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size > 1 ? me.roles.highest.position : 0;
    let applyPos = 0
    try {
        apply = await interaction.guild.members.fetch(apply.id) as GuildMember
        applyPos = apply.roles.cache.size > 1 ? apply.roles.highest.position : 0;
    } catch {
        apply = apply as User
    }
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
    longDescription: "Removes a member from the server - this will prevent them from rejoining until they are unbanned, and will delete a specified number of days of messages from them.",
    premiumOnly: true,
}
