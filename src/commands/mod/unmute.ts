import type { CommandInteraction, GuildMember } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

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
                }) +
                    `Are you sure you want to unmute <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
            )
            .setColor("Danger")
            .addCustomBoolean(
                "notify",
                "Notify user",
                false,
                null,
                "The user will be sent a DM",
                "ICONS.NOTIFY." + (notify ? "ON" : "OFF"),
                notify
            )
            .addReasonButton(reason ?? "")
            .send(reason !== null);
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) success = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) {
            notify = confirmation.components!["notify"]!.active;
        }
    } while (!timedOut && !success);
    if (confirmation.cancelled) return;
    if (confirmation.success) {
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
                timestamp: new Date().getTime()
            },
            list: {
                memberId: entry(member.user.id, `\`${member.user.id}\``),
                name: entry(member.user.id, renderUser(member.user)),
                unmuted: entry(new Date().getTime().toString(), renderDelta(new Date().getTime())),
                unmutedBy: entry(interaction.user.id, renderUser(interaction.user))
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
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.MUTE.GREEN")
                    .setTitle("Unmute")
                    .setDescription("No changes were made")
                    .setStatus("Success")
            ],
            components: []
        });
    }
};

const check = (interaction: CommandInteraction) => {
    if (!interaction.guild) return;
    const member = interaction.member as GuildMember;
    const me = interaction.guild.members.me!;
    const apply = interaction.options.getMember("user") as GuildMember;
    const memberPos = member.roles.cache.size > 1 ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size > 1 ? me.roles.highest.position : 0;
    const applyPos = apply.roles.cache.size > 1 ? apply.roles.highest.position : 0;
    // Do not allow unmuting the owner
    if (member.id === interaction.guild.ownerId) throw new Error("You cannot unmute the owner of the server");
    // Check if Nucleus can unmute the member
    if (!(mePos > applyPos)) throw new Error("I do not have a role higher than that member");
    // Check if Nucleus has permission to unmute
    if (!me.permissions.has("ModerateMembers")) throw new Error("I do not have the *Moderate Members* permission");
    // Allow the owner to unmute anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has moderate_members permission
    if (!member.permissions.has("ModerateMembers"))
        throw new Error("You do not have the *Moderate Members* permission");
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) throw new Error("You do not have a role higher than that member");
    // Allow unmute
    return true;
};

export { command, callback, check };
