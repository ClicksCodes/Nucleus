import type Discord from "discord.js";
import { ActionRowBuilder, APIMessageComponentEmoji, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, Message, ModalBuilder, RoleSelectMenuBuilder, RoleSelectMenuInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import createPageIndicator from "../../utils/createPageIndicator.js";
import { configToDropdown } from "../../actions/roleMenu.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("rolemenu")
        .setDescription("rolemenu")

interface ObjectSchema {
    name: string;
    description: string;
    min: number;
    max: number;
    options: {
        name: string;
        description: string | null;
        role: string;
    }[];
}

const editNameDescription = async (interaction: StringSelectMenuInteraction | ButtonInteraction, m: Message, data: {name?: string, description?: string}) => {

    let {name, description} = data;
    const modal = new ModalBuilder()
        .setTitle("Edit Name and Description")
        .setCustomId("editNameDescription")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId("name")
                        .setPlaceholder(name ?? "")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                    new TextInputBuilder()
                        .setCustomId("description")
                        .setPlaceholder(description ?? "")
                        .setStyle(TextInputStyle.Short)
                )
        )
    const button = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("back")
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
        )

    return [name, description]

}

const ellipsis = (str: string, max: number): string => {
    if (str.length <= max) return str;
    return str.slice(0, max - 3) + "...";
}

const createRoleMenuPage = async (interaction: StringSelectMenuInteraction | ButtonInteraction, m: Message, data?: ObjectSchema) => {
    if (!data) data = {
        name: "Role Menu Page",
        description: "A new role menu page",
        min: 0,
        max: 0,
        options: []
    };
    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
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

    let back = false
    do {
        const previewSelect = configToDropdown("Edit Roles", {name: data.name, description: data.description, min: 1, max: 1, options: data.options});
        const embed = new EmojiEmbed()
            .setTitle(`${data.name}`)
            .setStatus("Success")
            .setDescription(
                `**Description:**\n> ${data.description}\n\n` +
                `**Min:** ${data.min}` + (data.min === 0 ? " (Members will be given a skip button)" : "") + "\n" +
                `**Max:** ${data.max}\n`
            )

        interaction.editReply({embeds: [embed], components: [previewSelect, buttons]});
        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000, filter: (i) => i.user.id === interaction.user.id && i.message.id === m.id && i.channelId === interaction.channelId}) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            back = true;
            break;
        }

        if (i.isStringSelectMenu()) {
            if(i.customId === "roles") {
                await i.deferUpdate();
                await createRoleMenuOptionPage(interaction, m, data.options.find((o) => o.role === (i as StringSelectMenuInteraction).values[0]));
            }
        } else if (i.isButton()) {
            await i.deferUpdate();
            switch (i.customId) {
                case "back":
                    back = true;
                    break;
                case "edit":
                    let [name, description] = await editNameDescription(interaction, m, data);
                    data.name = name ? name : data.name;
                    data.description = description ? description : data.description;
                    break;
                case "addRole":
                    data.options.push(await createRoleMenuOptionPage(interaction, m));
                    break;
            }
        }

    } while (!back);
    return data;
}

const createRoleMenuOptionPage = async (interaction: StringSelectMenuInteraction | ButtonInteraction, m: Message, data?: {name: string; description: string | null; role: string}) => {
    const { renderRole} = client.logger;
    if (!data) data = {
        name: "Role Menu Option",
        description: null,
        role: "No role set"
    };
    let back = false;
    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("back")
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji),
            new ButtonBuilder()
                .setCustomId("edit")
                .setLabel("Edit Details")
                .setStyle(ButtonStyle.Primary)
                .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji)
        );
    do {
        const roleSelect = new RoleSelectMenuBuilder().setCustomId("role").setPlaceholder(data.role ? "Set role to" : "Set the role");
        const embed = new EmojiEmbed()
            .setTitle(`${data.name ?? "New Role Menu Option"}`)
            .setStatus("Success")
            .setDescription(
                `**Description:**\n> ${data.description ?? "No description set"}\n\n` +
                `**Role:** ${renderRole((await interaction.guild!.roles.fetch(data.role))!) ?? "No role set"}\n`
            )

        interaction.editReply({embeds: [embed], components: [new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect), buttons]});

        let i: RoleSelectMenuInteraction | ButtonInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000, filter: (i) => i.user.id === interaction.user.id && i.message.id === m.id && i.channelId === interaction.channelId}) as ButtonInteraction | RoleSelectMenuInteraction;
        } catch (e) {
            back = true;
            break;
        }

        if (i.isRoleSelectMenu()) {
            if(i.customId === "role") {
                await i.deferUpdate();
                data.role = (i as RoleSelectMenuInteraction).values[0]!;
            }
        } else if (i.isButton()) {
            await i.deferUpdate();
            switch (i.customId) {
                case "back":
                    back = true;
                    break;
                case "edit":
                    await i.deferUpdate();
                    let [name, description] = await editNameDescription(interaction, m, data as {name: string; description: string});
                    data.name = name ? name : data.name;
                    data.description = description ? description : data.description;
                    break;
            }
        }
    } while (!back);
    return data;
}

const callback = async (interaction: CommandInteraction): Promise<void> => {
    if (!interaction.guild) return;
    const m = await interaction.reply({embeds: LoadingEmbed, ephemeral: true, fetchReply: true});

    let page = 0;
    let closed = false;
    const config = await client.database.guilds.read(interaction.guild.id);
    let currentObject: ObjectSchema[] = config.roleMenu.options;
    let modified = false;
    do {
        const embed = new EmojiEmbed()
            .setTitle("Role Menu Settings")
            .setEmoji("GUILD.GREEN")
            .setStatus("Success");
        const noRoleMenus = currentObject.length === 0;
        let current: ObjectSchema;

        const pageSelect = new StringSelectMenuBuilder()
            .setCustomId("page")
            .setPlaceholder("Select a Role Menu page to manage");
        const actionSelect = new StringSelectMenuBuilder()
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
        const buttonRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setEmoji(getEmojiByName("CONTROL.RIGHT", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === Object.keys(currentObject).length - 1),
                new ButtonBuilder()
                    .setCustomId("add")
                    .setLabel("New Page")
                    .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(Object.keys(currentObject).length >= 24),
                new ButtonBuilder()
                    .setCustomId("reorder")
                    .setLabel("Reorder Pages")
                    .setEmoji(getEmojiByName("ICONS.SHUFFLE", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(Object.keys(currentObject).length <= 1),
                new ButtonBuilder()
                    .setCustomId("save")
                    .setLabel("Save")
                    .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!modified),
            );
        if(noRoleMenus) {
            embed.setDescription("No role menu page have been set up yet. Use the button below to add one.\n\n" +
                createPageIndicator(1, 1, undefined, true)
            );
            pageSelect.setDisabled(true);
            actionSelect.setDisabled(true);
            pageSelect.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel("No role menu pages")
                .setValue("none")
            );
        } else {
            page = Math.min(page, Object.keys(currentObject).length - 1);
            current = currentObject[page]!;
            embed.setDescription(`**Currently Editing:** ${current.name}\n\n` +
                `**Description:** \`${current.description}\`\n` +
                `\n\n${createPageIndicator(Object.keys(config.roleMenu.options).length, page)}`
            );

            pageSelect.addOptions(
                currentObject.map((key: ObjectSchema, index) => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(ellipsis(key.name, 50))
                        .setDescription(ellipsis(key.description, 50))
                        .setValue(index.toString());
                })
            );

        }

        await interaction.editReply({embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(actionSelect), new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(pageSelect), buttonRow]});
        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000, filter: (i) => i.user.id === interaction.user.id && i.message.id === m.id && i.channelId === interaction.channelId}) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            closed = true;
            break;
        }

        await i.deferUpdate();
        if (i.isButton()) {
            switch (i.customId) {
                case "back":
                    page--;
                    break;
                case "next":
                    page++;
                    break;
                case "add":
                    currentObject.push(await createRoleMenuPage(i, m));
                    page = currentObject.length - 1;
                    break;
                case "reorder":
                    break;
                case "save":
                    client.database.guilds.write(interaction.guild.id, {"roleMenu.options": currentObject});
                    modified = false;
                    break;
            }
        } else if (i.isStringSelectMenu()) {
            switch (i.customId) {
                case "action":
                    switch(i.values[0]) {
                        case "edit":
                            currentObject[page] = await createRoleMenuPage(i, m, current!);
                            modified = true;
                            break;
                        case "delete":
                            currentObject.splice(page, 1);
                            break;
                    }
                    break;
                case "page":
                    page = parseInt(i.values[0]!);
                    break;
            }
        }

    } while (!closed)
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageRoles"))
        return "You must have the *Manage Roles* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
