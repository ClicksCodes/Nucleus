import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    CommandInteraction,
    Interaction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    Role,
    ButtonStyle,
    StringSelectMenuBuilder,
    TextInputBuilder,
    EmbedBuilder,
    ButtonComponent
} from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../utils/client.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("verify")
        .setDescription("Manage the role given after typing /verify")
        .addRoleOption((option) =>
            option.setName("role").setDescription("The role to give after verifying").setRequired(false)
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Message;
    if (interaction.options.get("role")?.role) {
        let role: Role;
        try {
            role = interaction.options.get("role")?.role as Role;
        } catch {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("GUILD.ROLES.DELETE")
                        .setTitle("Verify Role")
                        .setDescription("The role you provided is not a valid role")
                        .setStatus("Danger")
                ]
            });
        }
        role = role as Discord.Role;
        if (role.guild.id !== interaction.guild.id) {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify Role")
                        .setDescription("You must choose a role in this server")
                        .setStatus("Danger")
                        .setEmoji("GUILD.ROLES.DELETE")
                ]
            });
        }
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.ROLES.EDIT")
            .setTitle("Verify Role")
            .setDescription(`Are you sure you want to set the verify role to <@&${role.id}>?`)
            .setColor("Warning")
            .setFailedMessage("No changes were made", "Warning", "GUILD.ROLES.DELETE")
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            try {
                await client.database.guilds.write(interaction.guild.id, {
                    "verify.role": role.id,
                    "verify.enabled": true
                });
                const { log, NucleusColors, entry, renderUser, renderRole } = client.logger;
                const data = {
                    meta: {
                        type: "verifyRoleChanged",
                        displayName: "Verify Role Changed",
                        calculateType: "nucleusSettingsUpdated",
                        color: NucleusColors.green,
                        emoji: "CONTROL.BLOCKTICK",
                        timestamp: new Date().getTime()
                    },
                    list: {
                        memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                        changedBy: entry(interaction.user.id, renderUser(interaction.user)),
                        role: entry(role.id, renderRole(role))
                    },
                    hidden: {
                        guild: interaction.guild.id
                    }
                };
                log(data);
            } catch (e) {
                console.log(e);
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Verify Role")
                            .setDescription("Something went wrong while setting the verify role")
                            .setStatus("Danger")
                            .setEmoji("GUILD.ROLES.DELETE")
                    ],
                    components: []
                });
            }
        } else {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify Role")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                        .setEmoji("GUILD.ROLES.CREATE")
                ],
                components: []
            });
        }
    }
    let clicks = 0;
    const data = await client.database.guilds.read(interaction.guild.id);
    let role = data.verify.role;

    let timedOut = false;
    while (!timedOut) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify Role")
                    .setDescription(
                        role ? `Your verify role is currently set to <@&${role}>` : "You have not set a verify role"
                    )
                    .setStatus("Success")
                    .setEmoji("GUILD.ROLES.CREATE")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setCustomId("clear")
                        .setLabel(clicks ? "Click again to confirm" : "Reset role")
                        .setEmoji(getEmojiByName(clicks ? "TICKETS.ISSUE" : "CONTROL.CROSS", "id"))
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(!role),
                    new ButtonBuilder()
                        .setCustomId("send")
                        .setLabel("Add verify button")
                        .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id"))
                        .setStyle(ButtonStyle.Primary)
                ])
            ]
        });
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.message.id === m.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        await i.deferUpdate();
        if ((i.component as ButtonComponent).customId === "clear") {
            clicks ++;
            if (clicks === 2) {
                clicks = 0;
                await client.database.guilds.write(interaction.guild.id, null, ["verify.role", "verify.enabled"]);
                role = null;
            }
        } else {
            await i.deferUpdate();
            break;
        }
    }  // TODO: On save, clear SEN
    await interaction.editReply({
        embeds: [new EmbedBuilder(m.embeds[0]!.data).setFooter({ text: "Message closed" })],
        components: []
    });
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
