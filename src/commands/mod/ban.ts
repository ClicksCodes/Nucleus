import { CommandInteraction, GuildMember, ActionRowBuilder, ButtonBuilder, User, ButtonStyle } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import addPlurals from "../../utils/plurals.js";
import client from "../../utils/client.js";


const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("ban")
        .setDescription("Bans a user from the server")
        .addUserOption((option) => option.setName("user").setDescription("The user to ban").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("The reason for the ban").setRequired(false))
        .addNumberOption((option) =>
            option
                .setName("delete")
                .setDescription("The days of messages to delete | Default: 0")
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        );


const callback = async (interaction: CommandInteraction): Promise<void> => {
    const { renderUser } = client.logger;
    // TODO:[Modals] Replace this with a modal
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
                        (interaction.options.get("delete")?.value as number | null) ?? 0,
                        "day"
                    )} of messages will be deleted\n\n` +
                    `Are you sure you want to ban <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
            )
            .addCustomBoolean(
                "notify",
                "Notify user",
                false,
                undefined,
                null,
                "ICONS.NOTIFY." + (notify ? "ON" : "OFF"),
                notify
            )
            .setColor("Danger")
            .addReasonButton(reason ?? "")
            .send(reason !== null);
        reason = reason ?? "";
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) chosen = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) notify = confirmation.components["notify"]!.active;
    } while (!timedOut && !chosen)
    if (timedOut) return;
    if (confirmation.success) {
        reason = reason.length ? reason : null
        let dmd = false;
        let dm;
        const config = await client.database.guilds.read(interaction.guild!.id);
        try {
            if (notify) {
                dm = await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("PUNISH.BAN.RED")
                            .setTitle("Banned")
                            .setDescription(
                                `You have been banned in ${interaction.guild!.name}` + (reason ? ` for:\n> ${reason}` : ".")
                            )
                            .setStatus("Danger")
                    ],
                    components: config.moderation.ban.text ? [
                        new ActionRowBuilder().addComponents([
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setLabel(config.moderation.ban.text)
                                .setURL(config.moderation.ban.link!)
                        ])
                    ] : []
                });
                dmd = true;
            }
        } catch {
            dmd = false;
        }
        try {
            const member = interaction.options.getMember("user") as GuildMember;
            member.ban({
                days: Number(interaction.options.getNumber("delete") ?? 0),
                reason: reason ?? "No reason provided"
            });
            await client.database.history.create("ban", interaction.guild!.id, member.user, interaction.user, reason);
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
                    banned: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    bannedBy: entry(interaction.user.id, renderUser(interaction.user)),
                    reason: entry(reason, reason ? `\n> ${reason}` : "*No reason provided.*"),
                    accountCreated: entry(member.user.createdAt, renderDelta(member.user.createdAt)),
                    serverMemberCount: interaction.guild!.memberCount
                },
                hidden: {
                    guild: interaction.guild!.id
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
            if (dmd && dm) await dm.delete();
            return;
        }
        const failed = !dmd && notify;
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
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.BAN.GREEN")
                    .setTitle("Ban")
                    .setDescription("No changes were made")
                    .setStatus("Success")
            ],
            components: []
        });
    }
};

const check = async (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    const me = interaction.guild!.me!;
    let apply = interaction.options.getUser("user") as User | GuildMember;
    const memberPos = member.roles.cache.size > 1 ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size > 1 ? me.roles.highest.position : 0;
    let applyPos = 0
    try {
        apply = await interaction.guild!.members.fetch(apply.id) as GuildMember
        applyPos = apply.roles.cache.size > 1 ? apply.roles.highest.position : 0;
    } catch {
        apply = apply as User
    }
    // Do not allow banning the owner
    if (member.id === interaction.guild!.ownerId) throw new Error("You cannot ban the owner of the server");
    // Check if Nucleus can ban the member
    if (!(mePos > applyPos)) throw new Error("I do not have a role higher than that member");
    // Check if Nucleus has permission to ban
    if (!me.permissions.has("BAN_MEMBERS")) throw new Error("I do not have the *Ban Members* permission");
    // Do not allow banning Nucleus
    if (member.id === interaction.guild!.me!.id) throw new Error("I cannot ban myself");
    // Allow the owner to ban anyone
    if (member.id === interaction.guild!.ownerId) return true;
    // Check if the user has ban_members permission
    if (!member.permissions.has("BAN_MEMBERS")) throw new Error("You do not have the *Ban Members* permission");
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) throw new Error("You do not have a role higher than that member");
    // Allow ban
    return true;
};

export { command, callback, check };
