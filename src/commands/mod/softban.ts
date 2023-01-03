import { CommandInteraction, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";
import addPlural from "../../utils/plurals.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("softban")
        .setDescription("Kicks a user and deletes their messages")
        .addUserOption((option) => option.setName("user").setDescription("The user to softban").setRequired(true))
        .addIntegerOption((option) =>
            option
                .setName("delete")
                .setDescription("The days of messages to delete | Default: 0")
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const { renderUser } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let reason = null;
    let notify = true;
    let confirmation;
    let timedOut = false;
    let success = false;
    while (!timedOut && !success) {
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.BAN.RED")
            .setTitle("Softban")
            .setDescription(
                keyValueList({
                    user: renderUser(interaction.options.getUser("user")),
                    reason: reason ? "\n> " + (reason ?? "").replaceAll("\n", "\n> ") : "*No reason provided*"
                }) +
                    `The user **will${notify ? "" : " not"}** be notified\n` +
                    `${addPlural(
                        interaction.options.getInteger("delete") ? interaction.options.getInteger("delete") : 0,
                        "day"
                    )} of messages will be deleted\n\n` +
                    `Are you sure you want to softban <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
            )
            .setColor("Danger")
            .addCustomBoolean(
                "notify",
                "Notify user",
                false,
                null,
                null,
                null,
                "ICONS.NOTIFY." + (notify ? "ON" : "OFF"),
                notify
            )
            .addReasonButton(reason ?? "")
            .send(reason !== null);
        reason = reason ?? "";
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success) success = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) {
            notify = confirmation.components.notify.active;
        }
    }
    if (timedOut) return;
    if (confirmation.success) {
        let dmd = false;
        const config = await client.database.guilds.read(interaction.guild.id);
        try {
            if (notify) {
                await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("PUNISH.BAN.RED")
                            .setTitle("Softbanned")
                            .setDescription(
                                `You have been softbanned from ${interaction.guild.name}` +
                                    (reason ? ` for:\n> ${reason}` : ".")
                            )
                            .setStatus("Danger")
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            config.moderation.ban.text
                                ? [
                                      new ButtonBuilder()
                                          .setStyle(ButtonStyle.Link)
                                          .setLabel(config.moderation.ban.text)
                                          .setURL(config.moderation.ban.link)
                                  ]
                                : []
                        )
                    ]
                });
                dmd = true;
            }
        } catch {
            dmd = false;
        }
        const member = interaction.options.getMember("user") as GuildMember;
        try {
            await member.ban({
                days: Number(interaction.options.getInteger("delete") ?? 0),
                reason: reason
            });
            await interaction.guild.members.unban(member, "Softban");
        } catch {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.BAN.RED")
                        .setTitle("Softban")
                        .setDescription("Something went wrong and the user was not softbanned")
                        .setStatus("Danger")
                ],
                components: []
            });
        }
        await client.database.history.create("softban", interaction.guild.id, member.user, reason);
        const failed = !dmd && notify;
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji(`PUNISH.BAN.${failed ? "YELLOW" : "GREEN"}`)
                    .setTitle("Softban")
                    .setDescription("The member was softbanned" + (failed ? ", but could not be notified" : ""))
                    .setStatus(failed ? "Warning" : "Success")
            ],
            components: []
        });
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.BAN.GREEN")
                    .setTitle("Softban")
                    .setDescription("No changes were made")
                    .setStatus("Success")
            ],
            components: []
        });
    }
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    const me = interaction.guild.me!;
    const apply = interaction.options.getMember("user") as GuildMember;
    if (member === null || me === null || apply === null) throw new Error("That member is not in the server");
    const memberPos = member.roles.cache.size > 1 ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size > 1 ? me.roles.highest.position : 0;
    const applyPos = apply.roles.cache.size > 1 ? apply.roles.highest.position : 0;
    // Do not allow softbanning the owner
    if (member.id === interaction.guild.ownerId) throw new Error("You cannot softban the owner of the server");
    // Check if Nucleus can ban the member
    if (!(mePos > applyPos)) throw new Error("I do not have a role higher than that member");
    // Check if Nucleus has permission to ban
    if (!me.permissions.has("BAN_MEMBERS")) throw new Error("I do not have the *Ban Members* permission");
    // Do not allow softbanning Nucleus
    if (member.id === me.id) throw new Error("I cannot softban myself");
    // Allow the owner to softban anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has ban_members permission
    if (!member.permissions.has("BAN_MEMBERS")) throw new Error("You do not have the *Ban Members* permission");
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) throw new Error("You do not have a role higher than that member");
    // Allow softban
    return true;
};

export { command, callback, check };
