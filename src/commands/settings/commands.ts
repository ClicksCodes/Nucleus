import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import Discord, { CommandInteraction, MessageActionRow, MessageButton, TextInputComponent } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../../utils/client.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("commands")
        .setDescription("Links and text shown to a user after a moderator action is performed")
        .addRoleOption((o) => o.setName("role").setDescription("The role given when a member is muted"));

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    });
    let m;
    let clicked = "";
    if (interaction.options.getRole("role")) {
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.ROLES.DELETE")
            .setTitle("Moderation Commands")
            .setDescription(
                keyValueList({
                    role: `<@&${interaction.options.getRole("role").id}>`
                })
            )
            .setColor("Danger")
            .send(true);
        if (confirmation.cancelled) return
        if (confirmation.success) {
            await client.database.guilds.write(interaction.guild.id, {
                ["moderation.mute.role"]: interaction.options.getRole("role").id
            });
        }
    }
    let timedOut = false;
    while (!timedOut) {
        const config = await client.database.guilds.read(interaction.guild.id);
        const moderation = config.getKey("moderation");
        m = await interaction.editReply({
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
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setLabel("Warn")
                        .setEmoji(getEmojiByName("PUNISH.WARN.YELLOW", "id"))
                        .setCustomId("warn")
                        .setStyle("SECONDARY"),
                    new MessageButton()
                        .setLabel("Mute")
                        .setEmoji(getEmojiByName("PUNISH.MUTE.YELLOW", "id"))
                        .setCustomId("mute")
                        .setStyle("SECONDARY"),
                    new MessageButton()
                        .setLabel("Nickname")
                        .setEmoji(getEmojiByName("PUNISH.NICKNAME.GREEN", "id"))
                        .setCustomId("nickname")
                        .setStyle("SECONDARY")
                ]),
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setLabel("Kick")
                        .setEmoji(getEmojiByName("PUNISH.KICK.RED", "id"))
                        .setCustomId("kick")
                        .setStyle("SECONDARY"),
                    new MessageButton()
                        .setLabel("Softban")
                        .setEmoji(getEmojiByName("PUNISH.BAN.YELLOW", "id"))
                        .setCustomId("softban")
                        .setStyle("SECONDARY"),
                    new MessageButton()
                        .setLabel("Ban")
                        .setEmoji(getEmojiByName("PUNISH.BAN.RED", "id"))
                        .setCustomId("ban")
                        .setStyle("SECONDARY")
                ]),
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setLabel(clicked === "clearMuteRole" ? "Click again to confirm" : "Clear mute role")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setCustomId("clearMuteRole")
                        .setStyle("DANGER")
                        .setDisabled(!moderation.mute.role),
                    new MessageButton()
                        .setCustomId("timeout")
                        .setLabel("Mute timeout " + (moderation.mute.timeout ? "Enabled" : "Disabled"))
                        .setStyle(moderation.mute.timeout ? "SUCCESS" : "DANGER")
                        .setEmoji(getEmojiByName("CONTROL." + (moderation.mute.timeout ? "TICK" : "CROSS"), "id"))
                ])
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            timedOut = true;
            continue;
        }
        let chosen = moderation[i.customId] ?? { text: null, url: null };
        if (i.component.customId === "clearMuteRole") {
            i.deferUpdate();
            if (clicked === "clearMuteRole") {
                await client.database.guilds.write(interaction.guild.id, {
                    "moderation.mute.role": null
                });
            } else {
                clicked = "clearMuteRole";
            }
            continue;
        } else {
            clicked = "";
        }
        if (i.component.customId === "timeout") {
            await i.deferUpdate();
            await client.database.guilds.write(interaction.guild.id, {
                "moderation.mute.timeout": !moderation.mute.timeout
            });
            continue;
        } else if (i.customId) {
            await i.showModal(
                new Discord.Modal()
                    .setCustomId("modal")
                    .setTitle(`Options for ${i.customId}`)
                    .addComponents(
                        new MessageActionRow<TextInputComponent>().addComponents(
                            new TextInputComponent()
                                .setCustomId("name")
                                .setLabel("Button text")
                                .setMaxLength(100)
                                .setRequired(false)
                                .setStyle("SHORT")
                                .setValue(chosen.text ?? "")
                        ),
                        new MessageActionRow<TextInputComponent>().addComponents(
                            new TextInputComponent()
                                .setCustomId("url")
                                .setLabel("URL - Type {id} to insert the user's ID")
                                .setMaxLength(2000)
                                .setRequired(false)
                                .setStyle("SHORT")
                                .setValue(chosen.link ?? "")
                        )
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
                    new MessageActionRow().addComponents([
                        new MessageButton()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle("PRIMARY")
                            .setCustomId("back")
                    ])
                ]
            });
            let out;
            try {
                out = await modalInteractionCollector(
                    m,
                    (m) => m.channel.id === interaction.channel.id,
                    (_) => true
                );
            } catch (e) {
                continue;
            }
            if (out.fields) {
                const buttonText = out.fields.getTextInputValue("name");
                const buttonLink = out.fields.getTextInputValue("url").replace(/{id}/gi, "{id}");
                const current = chosen;
                if (current.text !== buttonText || current.link !== buttonLink) {
                    chosen = { text: buttonText, link: buttonLink };
                    await client.database.guilds.write(interaction.guild.id, {
                        ["moderation." + i.customId]: {
                            text: buttonText,
                            link: buttonLink
                        }
                    });
                }
            } else {
                continue;
            }
        }
    }
};

const check = (interaction: CommandInteraction, _defaultCheck: WrappedCheck) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_GUILD"))
        throw new Error("You must have the *Manage Server* permission to use this command");
    return true;
};

export { command };
export { callback };
export { check };
