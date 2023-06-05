import type Discord from "discord.js";
import {
    ActionRowBuilder,
    APIMessageComponentEmoji,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CommandInteraction,
    Message,
    ModalBuilder,
    RoleSelectMenuBuilder,
    RoleSelectMenuInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import createPageIndicator from "../../utils/createPageIndicator.js";
import { configToDropdown } from "../../actions/roleMenu.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import ellipsis from "../../utils/ellipsis.js";
import _ from "lodash";

const isEqual = _.isEqual;

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("rolemenu").setDescription("Allows you to change settings for the servers rolemenu");

interface ObjectSchema {
    name: string;
    description: string | null;
    min: number;
    max: number;
    options: {
        name: string;
        description: string | null;
        role: string;
    }[];
}

const defaultRolePageConfig = {
    name: "Role Menu Page",
    description: "A new role menu page",
    min: 0,
    max: 0,
    options: [{ name: "Role 1", description: null, role: "No role set" }]
};

const reorderRoleMenuPages = async (interaction: CommandInteraction, m: Message, currentObj: ObjectSchema[]) => {
    const reorderRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("reorder")
            .setPlaceholder("Select all pages in the order you want them to appear.")
            .setMinValues(currentObj.length)
            .setMaxValues(currentObj.length)
            .addOptions(
                currentObj.map((o, i) => new StringSelectMenuOptionBuilder().setLabel(o.name).setValue(i.toString()))
            )
    );
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("back")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
    );
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Role Menu")
                .setDescription("Select pages in the order you want them to appear.")
                .setStatus("Success")
        ],
        components: [reorderRow, buttonRow]
    });
    let out: StringSelectMenuInteraction | ButtonInteraction | null;
    try {
        out = (await m.awaitMessageComponent({
            filter: (i) => i.channel!.id === interaction.channel!.id,
            time: 300000
        })) as StringSelectMenuInteraction | ButtonInteraction | null;
    } catch (e) {
        console.error(e);
        out = null;
    }
    if (!out) return;
    await out.deferUpdate();
    if (out.isButton()) return;
    const values = out.values;

    const newOrder: ObjectSchema[] = currentObj.map((_, i) => {
        const index = values.findIndex((v) => v === i.toString());
        return currentObj[index];
    }) as ObjectSchema[];

    return newOrder;
};

const editNameDescription = async (
    i: ButtonInteraction,
    interaction: StringSelectMenuInteraction | ButtonInteraction,
    m: Message,
    data: { name?: string; description?: string | null }
) => {
    let { name, description } = data;
    const modal = new ModalBuilder()
        .setTitle("Edit Name and Description")
        .setCustomId("editNameDescription")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setLabel("Name")
                    .setCustomId("name")
                    .setPlaceholder("The name of the role (e.g. Programmer)")
                    .setStyle(TextInputStyle.Short)
                    .setValue(name ?? "")
                    .setRequired(true)
                    .setMaxLength(100)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setLabel("Description")
                    .setCustomId("description")
                    .setPlaceholder("A short description of the role (e.g. A role for people who code)")
                    .setStyle(TextInputStyle.Short)
                    .setValue(description ?? "")
                    .setRequired(false)
                    .setMaxLength(100)
            )
        );
    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("back")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
    );

    await i.showModal(modal);
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Role Menu")
                .setDescription("Modal opened. If you can't see it, click back and try again.")
                .setStatus("Success")
        ],
        components: [button]
    });

    let out: Discord.ModalSubmitInteraction | null;
    try {
        out = (await modalInteractionCollector(m, interaction.user)) as Discord.ModalSubmitInteraction | null;
    } catch (e) {
        console.error(e);
        out = null;
    }
    if (!out) return [name, description];
    if (out.isButton()) return [name, description];
    name = out.fields.fields.find((f) => f.customId === "name")?.value ?? name;
    description = out.fields.fields.find((f) => f.customId === "description")?.value ?? null;
    return [name, description];
};

const defaultRoleMenuData = {
    name: "New Page",
    description: "",
    min: 0,
    max: 1,
    options: []
};

const editRoleMenuPage = async (
    interaction: StringSelectMenuInteraction | ButtonInteraction,
    m: Message,
    data?: ObjectSchema
): Promise<ObjectSchema | null> => {
    if (!data) data = _.cloneDeep(defaultRoleMenuData);
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("back")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji),
        new ButtonBuilder()
            .setCustomId("edit")
            .setLabel("Edit")
            .setStyle(ButtonStyle.Primary)
            .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
        new ButtonBuilder()
            .setCustomId("addRole")
            .setLabel("Add Role")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id") as APIMessageComponentEmoji)
    );

    let back = false;
    do {
        const noRoles = data.options.length === 0;
        const previewSelect = configToDropdown(
            "Edit Roles",
            {
                name: data.name,
                description: data.description ?? null,
                min: 1,
                max: 1,
                options: noRoles ? [{ name: "Role 1", description: null, role: "No role set" }] : data.options
            },
            undefined,
            noRoles
        );
        const embed = new EmojiEmbed()
            .setTitle(`${data.name}`)
            .setStatus("Success")
            .setDescription(
                `**Description:**\n> ${data.description ?? '*No description set*'}\n\n` +
                    `**Min:** ${data.min}` +
                    (data.min === 0 ? " (Members will be given a skip button)" : "") +
                    "\n" +
                    `**Max:** ${data.max}\n` +
                    `\n**Roles:** ${data.options.length === 0 ? "*No roles set*" : data.options.length}`
            );

        await interaction.editReply({ embeds: [embed], components: [previewSelect, buttons] });
        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            i = (await m.awaitMessageComponent({
                time: 300000,
                filter: (i) =>
                    i.user.id === interaction.user.id && i.message.id === m.id && i.channelId === interaction.channelId
            })) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            back = true;
            break;
        }

        if (i.isStringSelectMenu()) {
            if (i.customId === "roles") {
                await i.deferUpdate();
                await createRoleMenuOptionPage(
                    interaction,
                    m,
                    data.options.find((o) => o.role === (i as StringSelectMenuInteraction).values[0]),
                    false
                );
            }
        } else if (i.isButton()) {
            switch (i.customId) {
                case "back": {
                    await i.deferUpdate();
                    back = true;
                    break;
                }
                case "edit": {
                    const [name, description] = await editNameDescription(i, interaction, m, data);
                    data.name = name ? name : data.name;
                    data.description = description ? description : data.description;
                    break;
                }
                case "addRole": {
                    await i.deferUpdate();
                    const out = await createRoleMenuOptionPage(interaction, m, undefined, true);
                    if (out) data.options.push(out);
                    break;
                }
            }
        }
    } while (!back);
    if (isEqual(data, defaultRolePageConfig)) return null;
    return data;
};

const createRoleMenuOptionPage = async (
    interaction: StringSelectMenuInteraction | ButtonInteraction,
    m: Message,
    data?: { name: string; description: string | null; role: string },
    newRole: boolean = false
) => {
    const initialData = _.cloneDeep(data);
    const { renderRole } = client.logger;
    if (!data)
        data = {
            name: "New role Menu Option",
            description: null,
            role: ""
        };
    let back = false;
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("back")
            .setLabel(newRole ? "Add" : "Back")
            .setStyle(newRole ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji),
        new ButtonBuilder()
            .setCustomId("edit")
            .setLabel("Edit Details")
            .setStyle(ButtonStyle.Primary)
            .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
        new ButtonBuilder()
            .setCustomId("delete")
            .setLabel("Delete")
            .setStyle(ButtonStyle.Danger)
            .setEmoji(getEmojiByName("TICKETS.ISSUE", "id") as APIMessageComponentEmoji),
        new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
    );
    do {
        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId("role")
            .setPlaceholder(data.role ? "Change role to" : "Select a role");
        const embed = new EmojiEmbed()
            .setTitle(`${data.name}`)
            .setStatus("Success")
            .setDescription(
                `**Description:**\n> ${data.description ?? "No description set"}\n\n` +
                    `**Role:** ${
                        data.role ? renderRole((await interaction.guild!.roles.fetch(data.role))!) : "No role set"
                    }\n`
            );

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect), buttons]
        });

        let i: RoleSelectMenuInteraction | ButtonInteraction;
        try {
            i = (await m.awaitMessageComponent({
                time: 300000,
                filter: (i) =>
                    i.user.id === interaction.user.id && i.message.id === m.id && i.channelId === interaction.channelId
            })) as ButtonInteraction | RoleSelectMenuInteraction;
        } catch (e) {
            back = true;
            break;
        }

        if (i.isRoleSelectMenu()) {
            if (i.customId === "role") {
                await i.deferUpdate();
                data.role = (i as RoleSelectMenuInteraction).values[0]!;
                await interaction.editReply({
                    embeds: [
                        new EmojiEmbed().setTitle(`Applying changes`).setStatus("Danger").setEmoji("NUCLEUS.LOADING")
                    ],
                    components: []
                });
            }
        } else if (i.isButton()) {
            switch (i.customId) {
                case "back": {
                    await i.deferUpdate();
                    back = true;
                    break;
                }
                case "edit": {
                    const [name, description] = await editNameDescription(
                        i,
                        interaction,
                        m,
                        data as { name: string; description: string }
                    );
                    data.name = name ? name : data.name;
                    data.description = description ? description : data.description;
                    break;
                }
                case "delete": {
                    await i.deferUpdate();
                    return null;
                }
                case "cancel": {
                    await i.deferUpdate();
                    if (newRole) return null;
                    else return initialData;
                }
            }
        }
    } while (!back);
    return data;
};

const callback = async (interaction: CommandInteraction): Promise<void> => {
    if (!interaction.guild) return;
    const m = await interaction.reply({ embeds: LoadingEmbed, ephemeral: true, fetchReply: true });

    let page = 0;
    let closed = false;
    const config = await client.database.guilds.read(interaction.guild.id);
    const currentObject: typeof config.roleMenu = _.cloneDeep(config.roleMenu);
    let modified = false;
    do {
        const embed = new EmojiEmbed().setTitle("Role Menu").setEmoji("GUILD.GREEN").setStatus("Success");
        const noRoleMenus = currentObject.options.length === 0;
        let current: ObjectSchema;

        const pageSelect = new StringSelectMenuBuilder()
            .setCustomId("page")
            .setPlaceholder("Select a Role Menu page to manage");
        let actionSelect;
        if (page === 0) {
            actionSelect = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("switch")
                    .setLabel(currentObject.enabled ? "Enabled" : "Disabled")
                    .setStyle(currentObject.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(
                        getEmojiByName(
                            currentObject.enabled ? "CONTROL.TICK" : "CONTROL.CROSS",
                            "id"
                        ) as APIMessageComponentEmoji
                    )
            );
        } else {
            actionSelect = new StringSelectMenuBuilder()
                .setCustomId("action")
                .setPlaceholder("Perform an action")
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Edit")
                        .setDescription("Edit this page")
                        .setValue("edit")
                        .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Delete")
                        .setDescription("Delete this page")
                        .setValue("delete")
                        .setEmoji(getEmojiByName("TICKETS.ISSUE", "id") as APIMessageComponentEmoji)
                );
        }
        const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("back")
                .setStyle(ButtonStyle.Primary)
                .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId("next")
                .setEmoji(getEmojiByName("CONTROL.RIGHT", "id") as APIMessageComponentEmoji)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === Object.keys(currentObject.options).length || noRoleMenus),
            new ButtonBuilder()
                .setCustomId("add")
                .setLabel("New Page")
                .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id") as APIMessageComponentEmoji)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(Object.keys(currentObject.options).length >= 24),
            new ButtonBuilder()
                .setCustomId("reorder")
                .setLabel("Reorder Pages")
                .setEmoji(getEmojiByName("ICONS.REORDER", "id") as APIMessageComponentEmoji)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(Object.keys(currentObject.options).length <= 1),
            new ButtonBuilder()
                .setCustomId("save")
                .setLabel("Save")
                .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(!modified)
        );
        if (noRoleMenus) {
            embed.setDescription(
                "No role menu pages have been set up yet. Use the button below to add one.\n\n" +
                    createPageIndicator(1, 1, undefined, true)
            );
            pageSelect.setDisabled(true);
            if (page > 0) (actionSelect as StringSelectMenuBuilder).setDisabled(true);
            pageSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel("No role menu pages").setValue("none"));
        } else if (page === 0) {
            const cross = getEmojiByName("CONTROL.CROSS");
            const tick = getEmojiByName("CONTROL.TICK");
            embed.setDescription(
                `**Enabled:** ${config.roleMenu.enabled ? `${tick} Yes` : `${cross} No`}\n\n` +
                    `**Pages:** ${currentObject.options.length}\n` +
                    (currentObject.options.length > 0
                        ? currentObject.options
                              .map((key: ObjectSchema) => {
                                  return `> **${key.name}:** ${key.description ?? "*No description set*"}`;
                              })
                              .join("\n")
                        : "")
            );
            if(currentObject.options.length > 0) {
                pageSelect.addOptions(
                    currentObject.options.map((key: ObjectSchema, index) => {
                        return new StringSelectMenuOptionBuilder()
                            .setLabel(ellipsis(key.name, 50))
                            .setDescription(ellipsis(key.description?.length ? (key.description.length > 0 ? key.description : "No description set") : "No description set", 50))
                            .setValue(index.toString());
                    })
                );
            } else {
                pageSelect.setDisabled(true);
                pageSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel("No role menu pages").setValue("none"));
            }
        } else {
            page = Math.max(Math.min(page, currentObject.options.length), 0);
            current = currentObject.options[page - 1]!;
            embed.setDescription(
                `**Currently Editing:** ${current.name}\n\n` +
                    `**Description:**\n> ${current.description ?? "*No description set*"}\n` +
                    `\n\n${createPageIndicator(Object.keys(config.roleMenu.options).length, page)}`
            );

            pageSelect.addOptions(
                currentObject.options.map((key: ObjectSchema, index) => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(ellipsis(key.name, 50))
                        .setDescription(ellipsis(key.description?.length ? (key.description.length > 0 ? key.description : "No description set") : "No description set", 50))
                        .setValue(index.toString());
                })
            );
        }

        await interaction.editReply({
            embeds: [embed],
            components: [
                page === 0
                    ? (actionSelect as ActionRowBuilder<ButtonBuilder>)
                    : new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                          actionSelect as StringSelectMenuBuilder
                      ),
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(pageSelect),
                buttonRow as ActionRowBuilder<ButtonBuilder>
            ]
        });
        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            i = (await m.awaitMessageComponent({
                time: 300000,
                filter: (i) =>
                    i.user.id === interaction.user.id && i.message.id === m.id && i.channelId === interaction.channelId
            })) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            closed = true;
            continue;
        }

        await i.deferUpdate();
        if (i.isButton()) {
            switch (i.customId) {
                case "back": {
                    page--;
                    break;
                }
                case "next": {
                    page++;
                    break;
                }
                case "add": {
                    const newPage = await editRoleMenuPage(i, m);
                    if (_.isEqual(newPage, defaultRoleMenuData)) {
                        break;
                    }
                    if (newPage) {
                        currentObject.options.push(newPage);
                        page = currentObject.options.length;
                        modified = true;
                    }
                    break;
                }
                case "reorder": {
                    const reordered = await reorderRoleMenuPages(interaction, m, currentObject.options);
                    if (!reordered) break;
                    currentObject.options = reordered;
                    modified = true;
                    break;
                }
                case "save": {
                    await client.database.guilds.write(interaction.guild.id, {
                        "roleMenu.options": currentObject.options
                    });
                    modified = false;
                    await client.memory.forceUpdate(interaction.guild.id);
                    break;
                }
                case "switch": {
                    currentObject.enabled = !currentObject.enabled;
                    modified = true;
                    break;
                }
            }
        } else if (i.isStringSelectMenu()) {
            switch (i.customId) {
                case "action": {
                    switch (i.values[0]) {
                        case "edit": {
                            const edited = await editRoleMenuPage(i, m, current!);
                            if (!edited) break;
                            currentObject.options[page] = edited;
                            modified = true;
                            break;
                        }
                        case "delete": {
                            if (page === 0 && currentObject.options.keys.length - 1 > 0) page++;
                            else page--;
                            currentObject.options.splice(page, 1);
                            modified = true;
                            break;
                        }
                    }
                    break;
                }
                case "page": {
                    page = parseInt(i.values[0]!);
                    break;
                }
            }
        }
    } while (!closed);
    await interaction.deleteReply();
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageRoles"))
        return "You must have the *Manage Roles* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
