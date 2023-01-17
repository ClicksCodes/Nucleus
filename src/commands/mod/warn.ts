import Discord, { CommandInteraction, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import { create, areTicketsEnabled } from "../../actions/createModActionTicket.js";
import client from "../../utils/client.js";
import { LinkWarningFooter } from "../../utils/defaults.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("warn")
        .setDescription("Warns a user")
        .addUserOption((option) => option.setName("user").setDescription("The user to warn").setRequired(true));

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (interaction.guild === null) return;
    const { log, NucleusColors, renderUser, entry } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let reason: string | null = null;
    let notify = true;
    let createAppealTicket = false;
    let confirmation;
    let timedOut = false;
    let success = false;
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.WARN.RED")
            .setTitle("Warn")
            .setDescription(
                keyValueList({
                    user: renderUser(interaction.options.getUser("user")!),
                    reason: reason ? "\n> " + reason.replaceAll("\n", "\n> ") : "*No reason provided*"
                }) +
                    `Are you sure you want to warn <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
            )
            .setColor("Danger")
            .addCustomBoolean(
                "appeal",
                "Create appeal ticket",
                !(await areTicketsEnabled(interaction.guild.id)),
                async () => await create(interaction.guild!, interaction.options.getUser("user")!, interaction.user, reason),
                "An appeal ticket will be created",
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
            .setFailedMessage("No changes were made", "Success", "PUNISH.WARN.GREEN")
            .send(reason !== null);
        reason = reason ?? "";
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) success = true;
        else if (confirmation.newReason) reason = confirmation.newReason;
        else if (confirmation.components) {
            notify = confirmation.components["notify"]!.active;
            createAppealTicket = confirmation.components["appeal"]!.active;
        }
    } while (!timedOut && !success)
    if (timedOut || !confirmation.success) return;
    let dmSent = false;
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
                        .setEmoji("PUNISH.WARN.RED")
                        .setTitle("Warned")
                        .setDescription(
                            `You have been warned in ${interaction.guild.name}` +
                                (reason ? ` for:\n${reason}` : ".\n*No reason was provided*") +
                                "\n\n" +
                                (createAppealTicket
                                    ? `You can appeal this in the ticket created in <#${confirmation.components!["appeal"]!.response}>`
                                    : "")
                        )
                        .setStatus("Danger")
                ],
                components: []
            };
            if (config.moderation.warn.text && config.moderation.warn.link) {
                messageData.embeds[0]!.setFooter(LinkWarningFooter)
                messageData.components.push(new ActionRowBuilder<Discord.ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel(config.moderation.warn.text)
                            .setURL(config.moderation.warn.link)
                        )
                )
            }
            await (interaction.options.getMember("user") as GuildMember).send(messageData);
            dmSent = true;
        }
    } catch (e) {
        dmSent = false;
    }
    const data = {
        meta: {
            type: "memberWarn",
            displayName: "Member warned",
            calculateType: "guildMemberPunish",
            color: NucleusColors.yellow,
            emoji: "PUNISH.WARN.YELLOW",
            timestamp: new Date().getTime()
        },
        list: {
            user: entry(
                (interaction.options.getMember("user") as GuildMember).user.id,
                renderUser((interaction.options.getMember("user") as GuildMember).user)
            ),
            warnedBy: entry(interaction.member!.user.id, renderUser(interaction.member!.user as Discord.User)),
            reason: reason ? `\n> ${reason}` : "*No reason provided*"
        },
        hidden: {
            guild: interaction.guild.id
        }
    };
    await client.database.history.create(
        "warn",
        interaction.guild.id,
        (interaction.options.getMember("user") as GuildMember).user,
        interaction.user,
        reason
    );
    log(data);
    const failed = !dmSent && notify;
    if (!failed) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.WARN.GREEN")
                    .setTitle("Warn")
                    .setDescription(
                        "The user was warned" +
                            (createAppealTicket
                                ? ` and an appeal ticket was opened in <#${confirmation.components!["appeal"]!.response}>`
                                : "")
                    )
                    .setStatus("Success")
            ],
            components: []
        });
    } else {
        const canSeeChannel = (interaction.options.getMember("user") as GuildMember)
            .permissionsIn(interaction.channel as Discord.TextChannel)
            .has("ViewChannel");
        const m = (await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.WARN.RED")
                    .setTitle("Warn")
                    .setDescription("The user's DMs are not open\n\nWhat would you like to do?")
                    .setStatus("Danger")
            ],
            components: [
                new ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
                    new Discord.ButtonBuilder().setCustomId("log").setLabel("Ignore and log").setStyle(ButtonStyle.Secondary),
                    new Discord.ButtonBuilder()
                        .setCustomId("here")
                        .setLabel("Warn here")
                        .setStyle(canSeeChannel ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(!canSeeChannel),
                    new Discord.ButtonBuilder()
                        .setCustomId("ticket")
                        .setLabel("Create ticket")
                        .setStyle(canSeeChannel ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(createAppealTicket)
                )
            ]
        })) as Discord.Message;
        let component;
        try {
            component = await m.awaitMessageComponent({
                filter: (m) => m.user.id === interaction.user.id && m.channel!.id === interaction.channel!.id,
                time: 300000
            });
        } catch (e) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.GREEN")
                        .setTitle("Warn")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                ],
                components: []
            });
        }
        if (component.customId === "here") {
            await interaction.channel!.send({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.RED")
                        .setTitle("Warn")
                        .setDescription("You have been warned" + (reason ? ` for:\n> ${reason}` : "."))
                        .setStatus("Danger")
                ],
                content: `<@!${(interaction.options.getMember("user") as GuildMember).id}>`,
                allowedMentions: {
                    users: [(interaction.options.getMember("user") as GuildMember).id]
                }
            });
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.GREEN")
                        .setTitle("Warn")
                        .setDescription(
                            "The user was warned" +
                                (createAppealTicket
                                    ? ` and an appeal ticket was opened in <#${confirmation.components!["appeal"]!.response}>`
                                    : "")
                        )
                        .setStatus("Success")
                ],
                components: []
            });
        } else if (component.customId === "log") {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.GREEN")
                        .setTitle("Warn")
                        .setDescription("The warn was logged")
                        .setStatus("Success")
                ],
                components: []
            });
        } else if (component.customId === "ticket") {
            const ticketChannel = await create(
                interaction.guild,
                interaction.options.getUser("user")!,
                interaction.user,
                reason,
                "Warn Notification"
            );
            if (ticketChannel === null) {
                return await interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("PUNISH.WARN.RED")
                            .setTitle("Warn")
                            .setDescription("A ticket could not be created")
                            .setStatus("Danger")
                    ],
                    components: []
                });
            }
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.GREEN")
                        .setTitle("Warn")
                        .setDescription(`A ticket was created in <#${ticketChannel}>`)
                        .setStatus("Success")
                ],
                components: []
            });
        }
    }
};

const check = (interaction: CommandInteraction) => {
    if (!interaction.guild) return;
    const member = interaction.member as GuildMember;
    const apply = interaction.options.getMember("user") as GuildMember | null;
    if (apply === null) return "That member is not in the server";
    const memberPos = member.roles.cache.size ? member.roles.highest.position : 0;
    const applyPos = apply.roles.cache.size ? apply.roles.highest.position : 0;
    // Do not allow warning bots
    if (member.user.bot) return "I cannot warn bots";
    // Allow the owner to warn anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has moderate_members permission
    if (!member.permissions.has("ModerateMembers"))
        return "You do not have the *Moderate Members* permission";
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) return "You do not have a role higher than that member";
    // Allow warn
    return true;
};

export { command, callback, check };
