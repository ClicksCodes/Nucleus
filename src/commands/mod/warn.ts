import Discord, { CommandInteraction, GuildMember, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import { create, areTicketsEnabled } from "../../actions/createModActionTicket.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("warn")
        .setDescription("Warns a user")
        .addUserOption((option) => option.setName("user").setDescription("The user to warn").setRequired(true));

const callback = async (interaction: CommandInteraction): Promise<void | unknown> => {
    const { log, NucleusColors, renderUser, entry } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let reason = null;
    let notify = true;
    let createAppealTicket = false;
    let confirmation;
    while (true) {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.WARN.RED")
            .setTitle("Warn")
            .setDescription(
                keyValueList({
                    user: renderUser(interaction.options.getUser("user")),
                    reason: reason ? "\n> " + (reason ?? "").replaceAll("\n", "\n> ") : "*No reason provided*"
                }) +
                    `The user **will${notify ? "" : " not"}** be notified\n\n` +
                    `Are you sure you want to warn <@!${(interaction.options.getMember("user") as GuildMember).id}>?`
            )
            .setColor("Danger")
            .addCustomBoolean(
                "appeal",
                "Create appeal ticket",
                !(await areTicketsEnabled(interaction.guild.id)),
                async () =>
                    await create(interaction.guild, interaction.options.getUser("user"), interaction.user, reason),
                "An appeal ticket will be created when Confirm is clicked",
                "CONTROL.TICKET",
                createAppealTicket
            )
            .addCustomBoolean(
                "notify",
                "Notify user",
                false,
                null,
                null,
                "ICONS.NOTIFY." + (notify ? "ON" : "OFF"),
                notify
            )
            .addReasonButton(reason ?? "")
            .send(reason !== null);
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
        try {
            if (notify) {
                const config = await client.database.guilds.read(interaction.guild.id);
                await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [
                        new EmojiEmbed()
                            .setEmoji("PUNISH.WARN.RED")
                            .setTitle("Warned")
                            .setDescription(
                                `You have been warned in ${interaction.guild.name}` +
                                    (reason ? ` for:\n> ${reason}` : ".") +
                                    "\n\n" +
                                    (confirmation.components.appeal.response
                                        ? `You can appeal this here ticket: <#${confirmation.components.appeal.response}>`
                                        : "")
                            )
                            .setStatus("Danger")
                            .setFooter({
                                text: config.moderation.warn.text
                                    ? "The button below is set by the server admins. Do not enter any passwords or other account details on the linked site."
                                    : "",
                                iconURL:
                                    "https://cdn.discordapp.com/emojis/952295894370369587.webp?size=128&quality=lossless"
                            })
                    ],
                    components: config.moderation.warn.text
                        ? [
                              new MessageActionRow().addComponents([
                                  new MessageButton()
                                      .setStyle("LINK")
                                      .setLabel(config.moderation.warn.text)
                                      .setURL(config.moderation.warn.link)
                              ])
                          ]
                        : []
                });
                dmd = true;
            }
        } catch {
            dmd = false;
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
                warnedBy: entry(interaction.member.user.id, renderUser(interaction.member.user)),
                reason: reason ? `\n> ${reason}` : "No reason provided"
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
        const failed = !dmd && notify;
        if (!failed) {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.GREEN")
                        .setTitle("Warn")
                        .setDescription(
                            "The user was warned" +
                                (confirmation.components.appeal.response
                                    ? ` and an appeal ticket was opened in <#${confirmation.components.appeal.response}>`
                                    : "")
                        )
                        .setStatus("Success")
                ],
                components: []
            });
        } else {
            const canSeeChannel = (interaction.options.getMember("user") as GuildMember)
                .permissionsIn(interaction.channel as Discord.TextChannel)
                .has("VIEW_CHANNEL");
            const m = (await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.WARN.RED")
                        .setTitle("Warn")
                        .setDescription("The user's DMs are not open\n\nWhat would you like to do?")
                        .setStatus("Danger")
                ],
                components: [
                    new MessageActionRow().addComponents([
                        new Discord.MessageButton().setCustomId("log").setLabel("Ignore and log").setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("here")
                            .setLabel("Warn here")
                            .setStyle(canSeeChannel ? "PRIMARY" : "SECONDARY")
                            .setDisabled(!canSeeChannel),
                        new Discord.MessageButton()
                            .setCustomId("ticket")
                            .setLabel("Create ticket")
                            .setStyle(canSeeChannel ? "SECONDARY" : "PRIMARY")
                    ])
                ]
            })) as Discord.Message;
            let component;
            try {
                component = await m.awaitMessageComponent({
                    filter: (m) => m.user.id === interaction.user.id,
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
                await interaction.channel.send({
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
                                    (confirmation.response
                                        ? ` and an appeal ticket was opened in <#${confirmation.response}>`
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
                    interaction.options.getUser("user"),
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
    } else {
        await interaction.editReply({
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
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    const me = interaction.guild.me!;
    const apply = interaction.options.getMember("user") as GuildMember;
    if (member === null || me === null || apply === null) throw "That member is not in the server";
    const memberPos = member.roles ? member.roles.highest.position : 0;
    const applyPos = apply.roles ? apply.roles.highest.position : 0;
    // Do not allow warning bots
    if (member.user.bot) throw "I cannot warn bots";
    // Allow the owner to warn anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has moderate_members permission
    if (!member.permissions.has("MODERATE_MEMBERS")) throw "You do not have the *Moderate Members* permission";
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) throw "You do not have a role higher than that member";
    // Allow warn
    return true;
};

export { command, callback, check };
