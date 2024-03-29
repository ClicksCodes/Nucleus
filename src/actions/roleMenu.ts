import { unknownServerIcon } from "./../utils/defaults.js";
import {
    ButtonBuilder,
    CommandInteraction,
    ButtonStyle,
    ButtonInteraction,
    StringSelectMenuOptionBuilder,
    StringSelectMenuBuilder,
    GuildMemberRoleManager,
    Role,
    ContextMenuCommandInteraction
} from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import { ActionRowBuilder } from "discord.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import client from "../utils/client.js";
import { LoadingEmbed } from "../utils/defaults.js";
import type { GuildConfig } from "../utils/database.js";
import { roleException } from "../utils/createTemporaryStorage.js";
import addPlural from "../utils/plurals.js";
import createPageIndicator from "../utils/createPageIndicator.js";

export interface RoleMenuSchema {
    guild: string;
    guildName: string;
    guildIcon: string;
    user: string;
    username: string;
    data: GuildConfig["roleMenu"]["options"];
    interaction: CommandInteraction | ButtonInteraction | ContextMenuCommandInteraction;
}

interface ObjectSchema {
    name: string;
    description?: string;
    min: number;
    max: number;
    options: {
        name: string;
        description: string | null;
        role: string;
    }[];
}

export const configToDropdown = (
    placeholder: string,
    currentPageData: ObjectSchema,
    selectedRoles?: string[],
    disabled: boolean = false
): ActionRowBuilder<StringSelectMenuBuilder> => {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("roles")
            .setPlaceholder(placeholder)
            .setMinValues(currentPageData.min)
            .setMaxValues(currentPageData.max)
            .setDisabled(disabled)
            .addOptions(
                currentPageData.options.map((option: { name: string; description: string | null; role: string }) => {
                    const builder = new StringSelectMenuOptionBuilder()
                        .setLabel(option.name)
                        .setValue(option.role)
                        .setDefault(selectedRoles ? selectedRoles.includes(option.role) : false);
                    if (option.description) builder.setDescription(option.description);
                    return builder;
                })
            )
    );
};

export async function callback(interaction: CommandInteraction | ButtonInteraction) {
    if (!interaction.member) return;
    if (!interaction.guild) return;
    const config = await client.database.guilds.read(interaction.guild.id);
    const options = config.roleMenu.options.filter((option) => option.options.length > 0 && option.enabled);
    if (!config.roleMenu.enabled) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Roles")
                    .setDescription(
                        "Self roles are currently disabled. Please contact a staff member or try again later."
                    )
                    .setStatus("Danger")
                    .setEmoji("GUILD.RED")
            ],
            ephemeral: true
        });
    }
    if (options.length === 0) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Roles")
                    .setDescription(
                        "There are no roles available. Please contact a staff member if you believe this is a mistake."
                    )
                    .setStatus("Danger")
                    .setEmoji("GUILD.RED")
            ],
            ephemeral: true
        });
    }
    const m = await interaction.reply({ embeds: LoadingEmbed, ephemeral: true, fetchReply: true });
    if (config.roleMenu.allowWebUI) {
        // TODO: Make rolemenu web ui
        const loginMethods: { webUI: boolean } = {
            webUI: false
        };
        try {
            const status = await fetch(client.config.baseUrl).then((res) => res.status);
            if (status !== 200) loginMethods.webUI = false;
        } catch (e) {
            loginMethods.webUI = false;
        }
        if (Object.values(loginMethods).some((i) => i)) {
            let code = "";
            if (loginMethods.webUI) {
                let length = 5;
                let itt = 0;
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                let valid = false;
                while (!valid) {
                    itt++;
                    code = "";
                    for (let i = 0; i < length; i++) {
                        code += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    if (code in client.roleMenu) continue;
                    if (itt > 1000) {
                        itt = 0;
                        length++;
                        continue;
                    }
                    valid = true;
                }
                client.roleMenu[code] = {
                    guild: interaction.guild.id,
                    guildName: interaction.guild.name,
                    guildIcon: interaction.guild.iconURL({ extension: "png" }) ?? unknownServerIcon,
                    user: interaction.member!.user.id,
                    username: interaction.member!.user.username,
                    data: config.roleMenu.options,
                    interaction: interaction as CommandInteraction | ButtonInteraction
                };
            }
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Roles")
                        .setDescription("Select how to choose your roles")
                        .setStatus("Success")
                        .setEmoji("GUILD.GREEN")
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setLabel("Online")
                            .setStyle(ButtonStyle.Link)
                            .setDisabled(!loginMethods.webUI)
                            .setURL(`${client.config.baseUrl}nucleus/rolemenu?code=${code}`),
                        new ButtonBuilder().setLabel("In Discord").setStyle(ButtonStyle.Primary).setCustomId("discord")
                    ])
                ]
            });
            let component;
            try {
                component = await m.awaitMessageComponent({
                    time: 300000,
                    filter: (i) => {
                        return (
                            i.user.id === interaction.user.id &&
                            i.channelId === interaction.channelId &&
                            i.message.id === m.id
                        );
                    }
                });
            } catch (e) {
                console.log(e);
                return;
            }
            await component.deferUpdate();
        }
    }
    const selectedRoles: string[][] = [];
    const maxPage = options.length;
    const completedPages: boolean[] = options.map((option) => option.min === 0);
    let memberRoleIDs = interaction.member.roles;
    if (memberRoleIDs instanceof GuildMemberRoleManager) {
        memberRoleIDs = memberRoleIDs.cache.map((r) => r.id);
    }
    for (const page of options) {
        selectedRoles.push(
            page.options
                .filter((option) => (memberRoleIDs as string[]).includes(option.role))
                .map((option) => option.role)
        );
    }

    let page = 0;
    let complete = completedPages.every((page) => page);
    let done = false;

    while (!(complete && done)) {
        const currentPageData = options[page]!;
        currentPageData.max = currentPageData.max === 0 ? currentPageData.options.length : currentPageData.max;
        const embed = new EmojiEmbed()
            .setTitle("Roles")
            .setDescription(
                `**${currentPageData.name}**\n` +
                    `> ${currentPageData.description}\n\n` +
                    (currentPageData.min === currentPageData.max
                        ? `Select ${addPlural(currentPageData.min, "role")}`
                        : `Select between ${currentPageData.min} and ${currentPageData.max} roles then press next`) +
                    "\n\n" +
                    createPageIndicator(maxPage, page)
            )
            .setStatus("Success")
            .setEmoji("GUILD.GREEN");
        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                    .setCustomId("back")
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
                    .setCustomId("next")
                    .setDisabled(page === maxPage - 1),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(getEmojiByName("CONTROL.TICK", "id"))
                    .setCustomId("done")
                    .setDisabled(!complete)
            ),
            configToDropdown("Select...", currentPageData, selectedRoles[page])
        ];
        await interaction.editReply({
            embeds: [embed],
            components: components
        });
        let component;
        try {
            component = await m.awaitMessageComponent({
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
            console.log(e);
            return;
        }
        await component.deferUpdate();
        if (component.customId === "back") {
            page = Math.max(0, page - 1);
        } else if (component.customId === "next") {
            page = Math.min(maxPage - 1, page + 1);
        } else if (component.customId === "done") {
            done = true;
        } else if (component.customId === "roles" && component.isStringSelectMenu()) {
            selectedRoles[page] = component.values;
            completedPages[page] = true;
            page = Math.min(maxPage - 1, page + 1);
        }
        complete = completedPages.every((page) => page);
    }

    const fullRoleList: string[] = selectedRoles.flat();

    const memberRoles = (interaction.member.roles as GuildMemberRoleManager).cache.map((r) => r.id); // IDs
    let rolesToRemove = config.roleMenu.options.map((o) => o.options.map((o) => o.role)).flat(); // IDs
    rolesToRemove = rolesToRemove.filter((r) => memberRoles.includes(r)).filter((r) => !fullRoleList.includes(r)); // IDs
    let roleObjectsToAdd = fullRoleList
        .map((r) => interaction.guild!.roles.cache.get(r)) // Role objects
        .filter((r) => r !== undefined) as Role[];
    roleObjectsToAdd = roleObjectsToAdd.filter((r) => !memberRoles.includes(r.id)); // Role objects
    try {
        roleException(interaction.guild.id, interaction.user.id);
        await (interaction.member.roles as GuildMemberRoleManager).remove(rolesToRemove);
        await (interaction.member.roles as GuildMemberRoleManager).add(roleObjectsToAdd);
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
                .setDescription("Roles have been updated")
                .setStatus("Success")
                .setEmoji("GUILD.GREEN")
        ],
        components: []
    });
    return;
}
