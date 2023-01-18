import { LinkWarningFooter } from '../../utils/defaults.js';
import { CommandInteraction, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import type Discord from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("kick")
        .setDescription("Kicks a user from the server")
        .addUserOption((option) => option.setName("user").setDescription("The user to kick").setRequired(true));

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const { renderUser } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let reason: string | null = null;
    let notify = true;
    let confirmation;
    let timedOut = false;
    let success = false;
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.KICK.RED")
            .setTitle("Kick")
            .setDescription(
                keyValueList({
                    user: renderUser(interaction.options.getUser("user")!),
                    reason: reason ? "\n> " + (reason).replaceAll("\n", "\n> ") : "*No reason provided*"
                }) +
                    `Are you sure you want to kick <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
            )
            .setColor("Danger")
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
            .setFailedMessage("No changes were made", "Success", "PUNISH.KICK.GREEN")
            .send(reason !== null);
        reason = reason ?? "";
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) success = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) {
            notify = confirmation.components["notify"]!.active;
        }
    } while (!timedOut && !success)
    if (timedOut || !confirmation.success) return;
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
                        .setEmoji("PUNISH.KICK.RED")
                        .setTitle("Kicked")
                        .setDescription(
                            `You have been kicked from ${interaction.guild.name}` +
                                (reason ? ` for:\n${reason}` : ".\n*No reason was provided.*")
                        )
                        .setStatus("Danger")
                ],
                components: []
            };
            if (config.moderation.kick.text && config.moderation.kick.link) {
                messageData.embeds[0]!.setFooter(LinkWarningFooter)
                messageData.components.push(new ActionRowBuilder<Discord.ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel(config.moderation.kick.text)
                            .setURL(config.moderation.kick.link.replaceAll("{id}", (interaction.options.getMember("user") as GuildMember).id))
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
        (interaction.options.getMember("user") as GuildMember).kick(reason || "No reason provided");
        const member = interaction.options.getMember("user") as GuildMember;
        await client.database.history.create("kick", interaction.guild.id, member.user, interaction.user, reason);
        const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
        const timeInServer = member.joinedTimestamp ? entry(
            (new Date().getTime() - member.joinedTimestamp).toString(),
            humanizeDuration(new Date().getTime() - member.joinedTimestamp, {
                round: true
            })
        ) : entry(null, "*Unknown*")
        const data = {
            meta: {
                type: "memberKick",
                displayName: "Member Kicked",
                calculateType: "guildMemberPunish",
                color: NucleusColors.red,
                emoji: "PUNISH.KICK.RED",
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(member.id, `\`${member.id}\``),
                name: entry(member.id, renderUser(member.user)),
                joined: undefined as (unknown | typeof entry),
                kicked: entry(new Date().getTime().toString(), renderDelta(new Date().getTime())),
                kickedBy: entry(interaction.user.id, renderUser(interaction.user)),
                reason: entry(reason, reason ? `\n> ${reason}` : "*No reason provided.*"),
                timeInServer: timeInServer,
                serverMemberCount: member.guild.memberCount
            },
            hidden: {
                guild: member.guild.id
            }
        };
        if (member.joinedTimestamp) {
            data.list.joined = entry(member.joinedTimestamp.toString(), renderDelta(member.joinedTimestamp))
        }
        await client.database.history.create(
            "kick",
            interaction.guild.id,
            member.user,
            interaction.user,
            reason
        )
        log(data);
    } catch {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.KICK.RED")
                    .setTitle("Kick")
                    .setDescription("Something went wrong and the user was not kicked")
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
                .setEmoji(`PUNISH.KICK.${failed ? "YELLOW" : "GREEN"}`)
                .setTitle("Kick")
                .setDescription("The member was kicked" + (failed ? ", but could not be notified" : ""))
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
    // Do not allow kicking the owner
    if (member.id === interaction.guild.ownerId) return "You cannot kick the owner of the server";
    // Check if Nucleus can kick the member
    if (!(mePos > applyPos)) return "I do not have a role higher than that member";
    // Check if Nucleus has permission to kick
    if (!me.permissions.has("KickMembers")) return "I do not have the *Kick Members* permission";
    // Do not allow kicking Nucleus
    if (member.id === interaction.guild.members.me!.id) return "I cannot kick myself";
    // Allow the owner to kick anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has kick_members permission
    if (!member.permissions.has("KickMembers")) return "You do not have the *Kick Members* permission";
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) return "You do not have a role higher than that member";
    // Allow kick
    return true;
};

export { command, callback, check };
