import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    CommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonComponent,
    TextInputBuilder,
    RoleSelectMenuBuilder
} from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../utils/client.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("moderation")
        .setDescription("Links and text shown to a user after a moderator action is performed");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const m = await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    });
    let timedOut = false;
    while (!timedOut) {
        const config = await client.database.guilds.read(interaction.guild!.id);
        const moderation = config.moderation;
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Moderation Commands")
                    .setEmoji("PUNISH.BAN.GREEN")
                    .setStatus("Success")
                    .setDescription(
                        "These links are shown below the message sent in a user's DM when they are punished.\n\n" +
                            "**Mute Role:** " +
                            (moderation.mute.role ? `<@&${moderation.mute.role}>` : "*None set*")
                    )
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel("Warn")
                        .setEmoji(getEmojiByName("PUNISH.WARN.YELLOW", "id"))
                        .setCustomId("warn")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel("Mute")
                        .setEmoji(getEmojiByName("PUNISH.MUTE.YELLOW", "id"))
                        .setCustomId("mute")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel("Nickname")
                        .setEmoji(getEmojiByName("PUNISH.NICKNAME.GREEN", "id"))
                        .setCustomId("nickname")
                        .setStyle(ButtonStyle.Secondary)
                ]),
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel("Kick")
                        .setEmoji(getEmojiByName("PUNISH.KICK.RED", "id"))
                        .setCustomId("kick")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel("Softban")
                        .setEmoji(getEmojiByName("PUNISH.BAN.YELLOW", "id"))
                        .setCustomId("softban")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel("Ban")
                        .setEmoji(getEmojiByName("PUNISH.BAN.RED", "id"))
                        .setCustomId("ban")
                        .setStyle(ButtonStyle.Secondary)
                ]),
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setCustomId("timeout")
                        .setLabel("Mute timeout " + (moderation.mute.timeout ? "Enabled" : "Disabled"))
                        .setStyle(moderation.mute.timeout ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setEmoji(getEmojiByName("CONTROL." + (moderation.mute.timeout ? "TICK" : "CROSS"), "id"))
                ]),
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                    new RoleSelectMenuBuilder().setCustomId("muteRole").setPlaceholder("Select a new mute role")
                )
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => {
                    return (
                        i.user.id === interaction.user.id &&
                        i.channel!.id === interaction.channel!.id &&
                        i.message.id === m.id
                    );
                }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        type modIDs = "mute" | "kick" | "ban" | "softban" | "warn" | "role";
        let chosen = moderation[i.customId as modIDs];
        if (i.isRoleSelectMenu()) {
            await i.deferUpdate();
            await client.database.guilds.write(interaction.guild!.id, {
                "moderation.mute.role": i.values[0]!
            });
            continue;
        } else if ((i.component as ButtonComponent).customId === "timeout") {
            await i.deferUpdate();
            await client.database.guilds.write(interaction.guild!.id, {
                "moderation.mute.timeout": !moderation.mute.timeout
            });
            continue;
        } else if (i.customId) {
            await i.showModal(
                new Discord.ModalBuilder()
                    .setCustomId("modal")
                    .setTitle(`Options for ${i.customId}`)
                    .addComponents(
                        new ActionRowBuilder<TextInputBuilder>()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setLabel("Button text")
                                    .setMaxLength(100)
                                    .setRequired(false)
                                    .setStyle(Discord.TextInputStyle.Short)
                                    .setValue(chosen.text ?? "")
                            )
                            .toJSON(),
                        new ActionRowBuilder<TextInputBuilder>()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId("url")
                                    .setLabel("URL - Type {id} to insert the user's ID")
                                    .setMaxLength(2000)
                                    .setRequired(false)
                                    .setStyle(Discord.TextInputStyle.Short)
                                    .setValue(chosen.link ?? "")
                            )
                            .toJSON()
                    )
            );
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Moderation Links")
                        .setDescription("Modal opened. If you can't see it, click back and try again.")
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId("back")
                    ])
                ]
            });
            let out: Discord.ModalSubmitInteraction | null;
            try {
                out = (await modalInteractionCollector(m, interaction.user)) as Discord.ModalSubmitInteraction | null;
            } catch (e) {
                continue;
            }
            if (!out || out.isButton()) continue;
            const buttonText = out.fields.getTextInputValue("name");
            const buttonLink = out.fields.getTextInputValue("url").replace(/{id}/gi, "{id}");
            const current = chosen;
            if (current.text !== buttonText || current.link !== buttonLink) {
                chosen = { text: buttonText, link: buttonLink };
                await client.database.guilds.write(interaction.guild!.id, {
                    ["moderation." + i.customId]: {
                        text: buttonText,
                        link: buttonLink
                    }
                });
            }
        }
    }
    await interaction.deleteReply();
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
