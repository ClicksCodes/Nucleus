import { Interaction, MessageButton } from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import { MessageActionRow, MessageSelectMenu } from "discord.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";
import { LoadingEmbed } from "../utils/defaultEmbeds.js";
import type { GuildConfig } from "../utils/database.js";

export interface RoleMenuSchema {
    guild: string;
    guildName: string;
    guildIcon: string;
    user: string;
    username: string;
    data: GuildConfig["roleMenu"]["options"];
    interaction: Interaction;
}

export async function callback(interaction: Interaction) {
    const config = await client.database.guilds.read(interaction.guild.id);
    if (!config.roleMenu.enabled)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Roles")
                    .setDescription(
                        "Self roles are currently disabled. Please contact a staff member or try again later."
                    )
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ],
            ephemeral: true
        });
    if (config.roleMenu.options.length === 0)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Roles")
                    .setDescription("There are no roles available. Please contact a staff member or try again later.")
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ],
            ephemeral: true
        });
    await interaction.reply({ embeds: LoadingEmbed, ephemeral: true });
    let m;
    if (config.roleMenu.allowWebUI) {
        let code = "";
        let length = 5;
        let itt = 0;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let valid = false;
        while (!valid) {
            itt += 1;
            code = "";
            for (let i = 0; i < length; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (code in client.roleMenu) continue;
            if (itt > 1000) {
                itt = 0;
                length += 1;
                continue;
            }
            valid = true;
        }
        client.roleMenu[code] = {
            guild: interaction.guild.id,
            guildName: interaction.guild.name,
            guildIcon: interaction.guild.iconURL({ format: "png" }),
            user: interaction.member.user.id,
            username: interaction.member.user.username,
            data: config.roleMenu.options,
            interaction: interaction
        };
        let up = true;
        up = false; // FIXME: Role menu does not yet exist, so the web UI is never up
        /*        try {
            const status = await fetch(client.config.baseUrl).then((res) => res.status);
            if (status !== 200) up = false;
        } catch {
            up = false;
        }*/
        m = await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Roles")
                    .setDescription("Select how to choose your roles")
                    .setStatus("Success")
                    .setEmoji("GUILD.GREEN")
            ],
            components: [
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setLabel("Online")
                        .setStyle("LINK")
                        .setDisabled(!up)
                        .setURL(`${client.config.baseUrl}nucleus/rolemenu?code=${code}`),
                    new MessageButton().setLabel("Manual").setStyle("PRIMARY").setCustomId("manual")
                ])
            ]
        });
    }
    let component;
    try {
        component = await m.awaitMessageComponent({ time: 300000 });
    } catch (e) {
        return;
    }
    component.deferUpdate();
    let rolesToAdd = [];
    for (let i = 0; i < config.roleMenu.options.length; i++) {
        const object = config.roleMenu.options[i];
        const m = await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Roles")
                    .setEmoji("GUILD.GREEN")
                    .setDescription(
                        `**${object.name}**` +
                            (object.description ? `\n${object.description}` : "") +
                            `\n\nSelect ${object.min}` +
                            (object.min !== object.max ? ` to ${object.max}` : "") +
                            ` role${object.max === 1 ? "" : "s"} to add.`
                    )
                    .setStatus("Success")
                    .setFooter({
                        text: `Step ${i + 1}/${config.roleMenu.options.length}`
                    })
            ],
            components: [
                new MessageActionRow().addComponents(
                    [
                        new MessageButton()
                            .setLabel("Cancel")
                            .setStyle("DANGER")
                            .setCustomId("cancel")
                            .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                    ].concat(
                        object.min === 0
                            ? [
                                  new MessageButton()
                                      .setLabel("Skip")
                                      .setStyle("SECONDARY")
                                      .setCustomId("skip")
                                      .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
                              ]
                            : []
                    )
                )
            ].concat([
                new MessageActionRow().addComponents([
                    new MessageSelectMenu()
                        .setPlaceholder(`${object.name}`)
                        .setCustomId("rolemenu")
                        .setMinValues(object.min)
                        .setMaxValues(object.max)
                        .setOptions(
                            object.options.map((o) => {
                                return {
                                    label: o.name,
                                    description: o.description,
                                    value: o.role
                                };
                            })
                        )
                ])
            ])
        });
        let component;
        try {
            component = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            return;
        }
        component.deferUpdate();
        if (component.customId === "rolemenu") {
            rolesToAdd = rolesToAdd.concat(component.values);
        } else if (component.customId === "cancel") {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Roles")
                        .setDescription("Cancelled. No changes were made.")
                        .setStatus("Danger")
                        .setEmoji("GUILD.RED")
                ],
                components: []
            });
        }
    }
    let rolesToRemove = config.roleMenu.options.map((o) => o.options.map((o) => o.role)).flat();
    const memberRoles = interaction.member.roles.cache.map((r) => r.id);
    rolesToRemove = rolesToRemove.filter((r) => memberRoles.includes(r)).filter((r) => !rolesToAdd.includes(r));
    rolesToAdd = rolesToAdd.filter((r) => !memberRoles.includes(r));
    try {
        await interaction.member.roles.remove(rolesToRemove);
        await interaction.member.roles.add(rolesToAdd);
    } catch (e) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Roles")
                    .setDescription(
                        "Something went wrong and your roles were not added. Please contact a staff member or try again later."
                    )
                    .setStatus("Danger")
                    .setEmoji("GUILD.RED")
            ],
            components: []
        });
    }
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Roles")
                .setDescription("Roles have been added. You may close this message.")
                .setStatus("Success")
                .setEmoji("GUILD.GREEN")
        ],
        components: []
    });
    return;
}
