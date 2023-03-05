import type { CommandInteraction, GuildMember } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("unmute")
        .setDescription("Unmutes a user")
        .addUserOption((option) => option.setName("user").setDescription("The user to unmute").setRequired(true));

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const { log, NucleusColors, renderUser, entry, renderDelta } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let reason: string | null = null;
    let notify = false;
    let confirmation;
    let timedOut = false;
    let success = false;
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.MUTE.RED")
            .setTitle("Unmute")
            .setDescription(
                keyValueList({
                    user: renderUser(interaction.options.getUser("user")!),
                    reason: `\n> ${reason ? reason : "*No reason provided*"}`
                }) + `Are you sure you want to unmute <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
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
            .setFailedMessage("No changes were made", "Success", "PUNISH.MUTE.GREEN")
            .send(reason !== null);
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) success = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) {
            notify = confirmation.components!["notify"]!.active;
        }
    } while (!timedOut && !success);
    if (confirmation.cancelled || !confirmation.success) return;
    let dmSent = false;
    let dmMessage;
    try {
        if (notify) {
            dmMessage = await (interaction.options.getMember("user") as GuildMember).send({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.MUTE.GREEN")
                        .setTitle("Unmuted")
                        .setDescription(
                            `You have been unmuted in ${interaction.guild.name}` +
                                (reason ? ` for:\n> ${reason}` : " with no reason provided.")
                        )
                        .setStatus("Success")
                ]
            });
            dmSent = true;
        }
    } catch {
        dmSent = false;
    }
    const member = interaction.options.getMember("user") as GuildMember;
    try {
        member.timeout(0, reason ?? "*No reason provided*");
    } catch {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.MUTE.RED")
                    .setTitle("Unmute")
                    .setDescription("Something went wrong and the user was not unmuted")
                    .setStatus("Danger")
            ],
            components: []
        });
        if (dmSent && dmMessage) await dmMessage.delete();
        return;
    }
    await client.database.history.create(
        "unmute",
        interaction.guild.id,
        (interaction.options.getMember("user") as GuildMember).user,
        interaction.user,
        reason
    );
    const data = {
        meta: {
            type: "memberUnmute",
            displayName: "Unmuted",
            calculateType: "guildMemberPunish",
            color: NucleusColors.green,
            emoji: "PUNISH.MUTE.GREEN",
            timestamp: Date.now()
        },
        list: {
            memberId: entry(member.user.id, `\`${member.user.id}\``),
            name: entry(member.user.id, renderUser(member.user)),
            unmuted: entry(Date.now().toString(), renderDelta(Date.now())),
            unmutedBy: entry(interaction.user.id, renderUser(interaction.user))
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
    log(data);
    const failed = !dmSent && notify;
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setEmoji(`PUNISH.MUTE.${failed ? "YELLOW" : "GREEN"}`)
                .setTitle("Unmute")
                .setDescription("The member was unmuted" + (failed ? ", but could not be notified" : ""))
                .setStatus(failed ? "Warning" : "Success")
        ],
        components: []
    });
};

const check = (interaction: CommandInteraction, partial: boolean = false) => {
    if (!interaction.guild) return;
    const member = interaction.member as GuildMember;
    // Check if the user has moderate_members permission
    if (!member.permissions.has("ModerateMembers")) return "You do not have the *Moderate Members* permission";
    if (partial) return true;
    const me = interaction.guild.members.me!;
    const apply = interaction.options.getMember("user") as GuildMember;
    const memberPos = member.roles.cache.size > 1 ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size > 1 ? me.roles.highest.position : 0;
    const applyPos = apply.roles.cache.size > 1 ? apply.roles.highest.position : 0;
    // Do not allow unmuting the owner
    if (member.id === interaction.guild.ownerId) return "You cannot unmute the owner of the server";
    // Check if Nucleus can unmute the member
    if (!(mePos > applyPos)) return `I do not have a role higher than <@${apply.id}>`;
    // Check if Nucleus has permission to unmute
    if (!me.permissions.has("ModerateMembers")) return "I do not have the *Moderate Members* permission";
    // Allow the owner to unmute anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) return `You do not have a role higher than <@${apply.id}>`;
    // Allow unmute
    return true;
};

export { command, callback, check };
