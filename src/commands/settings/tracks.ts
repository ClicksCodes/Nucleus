import { ActionRowBuilder, APIMessageComponentEmoji, ButtonBuilder, ButtonInteraction, ButtonStyle, Collection, CommandInteraction, GuildMember, Message, ModalBuilder, ModalSubmitInteraction, PermissionsBitField, Role, RoleSelectMenuBuilder, RoleSelectMenuInteraction, SlashCommandSubcommandBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import client from "../../utils/client.js";
import createPageIndicator, { createVerticalTrack } from "../../utils/createPageIndicator.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import ellipsis from "../../utils/ellipsis.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";

const { renderRole } = client.logger

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("tracks")
        .setDescription("Manage the tracks for the server")

interface ObjectSchema {
    name: string;
    retainPrevious: boolean;
    nullable: boolean;
    track: string[];
    manageableBy: string[];
}


const editName = async (i: ButtonInteraction, interaction: StringSelectMenuInteraction | ButtonInteraction, m: Message, current?: string) => {

    let name = current ?? "";
    const modal = new ModalBuilder()
        .setTitle("Edit Name and Description")
        .setCustomId("editNameDescription")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                        .setLabel("Name")
                        .setCustomId("name")
                        .setPlaceholder("Name here...") // TODO: Make better placeholder
                        .setStyle(TextInputStyle.Short)
                        .setValue(name)
                        .setRequired(true)
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

    await i.showModal(modal)
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Tracks")
                .setDescription("Modal opened. If you can't see it, click back and try again.")
                .setStatus("Success")
        ],
        components: [button]
    });

    let out: ModalSubmitInteraction | null;
    try {
        out = await modalInteractionCollector(
            m,
            (m) => m.channel!.id === interaction.channel!.id,
            (_) => true
        ) as ModalSubmitInteraction | null;
    } catch (e) {
        console.error(e);
        out = null;
    }
    if(!out) return name;
    if (out.isButton()) return name;
    name = out.fields.fields.find((f) => f.customId === "name")?.value ?? name;
    return name

}

const reorderTracks = async (interaction: ButtonInteraction, m: Message, roles: Collection<string, Role>, currentObj: string[]) => {
    const reorderRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("reorder")
                .setPlaceholder("Select all roles in the order you want users to gain them (Lowest to highest rank).")
                .setMinValues(currentObj.length)
                .setMaxValues(currentObj.length)
                .addOptions(
                    currentObj.map((o, i) => new StringSelectMenuOptionBuilder()
                        .setLabel(roles.get(o)!.name)
                        .setValue(i.toString())
                    )
                )
        );
    const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("back")
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
        )
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Tracks")
                .setDescription("Select all roles in the order you want users to gain them (Lowest to highest rank).")
                .setStatus("Success")
        ],
        components: [reorderRow, buttonRow]
    });
    let out: StringSelectMenuInteraction | ButtonInteraction | null;
    try {
        out = await m.awaitMessageComponent({
            filter: (i) => i.channel!.id === interaction.channel!.id,
            time: 300000
        }) as StringSelectMenuInteraction | ButtonInteraction | null;
    } catch (e) {
        console.error(e);
        out = null;
    }
    if(!out) return;
    out.deferUpdate();
    if (out.isButton()) return;
    const values = out.values;

    const newOrder: string[] = currentObj.map((_, i) => {
        const index = values.findIndex(v => v === i.toString());
        return currentObj[index];
    }) as string[];

    return newOrder;
}

const editTrack = async (interaction: ButtonInteraction | StringSelectMenuInteraction, message: Message, roles: Collection<string, Role>, current?: ObjectSchema) => {
    const isAdmin = (interaction.member!.permissions as PermissionsBitField).has("Administrator");
    if(!current) {
        current = {
            name: "",
            retainPrevious: false,
            nullable: false,
            track: [],
            manageableBy: []
        }
    }

    const roleSelect = new ActionRowBuilder<RoleSelectMenuBuilder>()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId("addRole")
                .setPlaceholder("Select a role to add")
                .setDisabled(!isAdmin)
        );
    let closed = false;
    do {
        const editableRoles: string[] = current.track.map((r) => {
            if(!(roles.get(r)!.position >= (interaction.member as GuildMember).roles.highest.position)) return roles.get(r)!.name;
        }).filter(v => v !== undefined) as string[];
        const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("removeRole")
                    .setPlaceholder("Select a role to remove")
                    .setDisabled(!isAdmin)
                    .addOptions(
                        editableRoles.map((r, i) => {
                            return new StringSelectMenuOptionBuilder()
                            .setLabel(r)
                            .setValue(i.toString())}
                        )
                    )
            );
        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("edit")
                    .setLabel("Edit Name")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("reorder")
                    .setLabel("Reorder")
                    .setDisabled(!isAdmin)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(getEmojiByName("ICONS.REORDER", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("retainPrevious")
                    .setLabel("Retain Previous")
                    .setStyle(current.retainPrevious ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(getEmojiByName("CONTROL." + (current.retainPrevious ? "TICK" : "CROSS"), "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("nullable")
                    .setLabel(`Role ${current.nullable ? "Not " : ""}Required`)
                    .setStyle(current.nullable ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(getEmojiByName("CONTROL." + (current.nullable ? "TICK" : "CROSS"), "id") as APIMessageComponentEmoji)
        );

        const allowed: boolean[] = [];
        for (const role of current.track) {
            const disabled: boolean =
                roles.get(role)!.position >= (interaction.member as GuildMember).roles.highest.position;
            allowed.push(disabled)
        }
        const mapped = current.track.map(role => roles.find(aRole => aRole.id === role)!);

        const embed = new EmojiEmbed()
            .setTitle("Tracks")
            .setDescription(
                `**Currently Editing:** ${current.name}\n\n` +
                `${getEmojiByName("CONTROL." + (current.nullable ? "CROSS" : "TICK"))} Members ${current.nullable ? "don't " : ""}need a role in this track\n` +
                `${getEmojiByName("CONTROL." + (current.retainPrevious ? "TICK" : "CROSS"))} Members ${current.retainPrevious ? "" : "don't "}keep all roles below their current highest\n\n` +
                createVerticalTrack(
                    mapped.map(role => renderRole(role)), new Array(current.track.length).fill(false), allowed)
            )
            .setStatus("Success")

        interaction.editReply({embeds: [embed], components: [roleSelect, selectMenu, buttons]});

        let out: ButtonInteraction | RoleSelectMenuInteraction | StringSelectMenuInteraction | null;

        try {
            out = await message.awaitMessageComponent({
                filter: (i) => i.channel!.id === interaction.channel!.id,
                time: 300000
            }) as ButtonInteraction | RoleSelectMenuInteraction | StringSelectMenuInteraction | null;
        } catch (e) {
            console.error(e);
            out = null;
        }

        if(!out) return;
        if (out.isButton()) {
            out.deferUpdate();
            switch(out.customId) {
                case "back": {
                    closed = true;
                    break;
                }
                case "edit": {
                    current.name = (await editName(out, interaction, message, current.name))!;
                    break;
                }
                case "reorder": {
                    current.track = (await reorderTracks(out, message, roles, current.track))!;
                    break;
                }
                case "retainPrevious": {
                    current.retainPrevious = !current.retainPrevious;
                    break;
                }
                case "nullable": {
                    current.nullable = !current.nullable;
                    break;
                }
            }
        } else if (out.isStringSelectMenu()) {
            out.deferUpdate();
            switch(out.customId) {
                case "removeRole": {
                    const index = current.track.findIndex(v => v === editableRoles[parseInt((out! as StringSelectMenuInteraction).values![0]!)]);
                    current.track.splice(index, 1);
                    break;
                }
            }
        } else {
            switch(out.customId) {
                case "addRole": {
                    const role = out.values![0]!;
                    if(!current.track.includes(role)) {
                        current.track.push(role);
                    }
                    out.reply({content: "That role is already on this track", ephemeral: true})
                    break;
                }
            }
        }

    } while(!closed);
    return current;
}

const callback = async (interaction: CommandInteraction) => {

    const m = await interaction.reply({embeds: LoadingEmbed, fetchReply: true, ephemeral: true})
    const config = await client.database.guilds.read(interaction.guild!.id);
    const tracks: ObjectSchema[] = config.tracks;
    const roles = await interaction.guild!.roles.fetch();

    let page = 0;
    let closed = false;
    let modified = false;

    do {
        const embed = new EmojiEmbed()
            .setTitle("Track Settings")
            .setEmoji("TRACKS.ICON")
            .setStatus("Success");
        const noTracks = config.tracks.length === 0;
        let current: ObjectSchema;

        const pageSelect = new StringSelectMenuBuilder()
            .setCustomId("page")
            .setPlaceholder("Select a track to manage");
        const actionSelect = new StringSelectMenuBuilder()
            .setCustomId("action")
            .setPlaceholder("Perform an action")
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel("Edit")
                    .setDescription("Edit this track")
                    .setValue("edit")
                    .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Delete")
                    .setDescription("Delete this track")
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
                    .setDisabled(page === Object.keys(tracks).length - 1),
                new ButtonBuilder()
                    .setCustomId("add")
                    .setLabel("New Track")
                    .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(Object.keys(tracks).length >= 24),
                new ButtonBuilder()
                    .setCustomId("save")
                    .setLabel("Save")
                    .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!modified),
            );
        if(noTracks) {
            embed.setDescription("No tracks have been set up yet. Use the button below to add one.\n\n" +
                createPageIndicator(1, 1, undefined, true)
            );
            pageSelect.setDisabled(true);
            actionSelect.setDisabled(true);
            pageSelect.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel("No tracks")
                .setValue("none")
            );
        } else {
            page = Math.min(page, Object.keys(tracks).length - 1);
            current = tracks[page]!;
            const mapped = current.track.map(role => roles.find(aRole => aRole.id === role)!);
            embed.setDescription(`**Currently Editing:** ${current.name}\n\n` +
                `${getEmojiByName("CONTROL." + (current.nullable ? "CROSS" : "TICK"))} Members ${current.nullable ? "don't " : ""}need a role in this track\n` +
                `${getEmojiByName("CONTROL." + (current.retainPrevious ? "TICK" : "CROSS"))} Members ${current.retainPrevious ? "" : "don't "}keep all roles below their current highest\n\n` +
                createVerticalTrack(mapped.map(role => renderRole(role)), new Array(current.track.length).fill(false)) +
                `\n${createPageIndicator(config.tracks.length, page)}`
            );

            pageSelect.addOptions(
                tracks.map((key: ObjectSchema, index) => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(ellipsis(key.name, 50))
                        .setDescription(ellipsis(roles.get(key.track[0]!)?.name!, 50))
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
                    const newPage = await editTrack(i, m, roles)
                    if(!newPage) break;
                    tracks.push();
                    page = tracks.length - 1;
                    break;
                }
                case "save": {
                    client.database.guilds.write(interaction.guild!.id, {tracks: tracks});
                    modified = false;
                    break;
                }
            }
        } else if (i.isStringSelectMenu()) {
            switch (i.customId) {
                case "action": {
                    switch(i.values[0]) {
                        case "edit": {
                            const edited = await editTrack(i, m, roles, current!);
                            if(!edited) break;
                            tracks[page] = edited;
                            modified = true;
                            break;
                        }
                        case "delete": {
                            if(page === 0 && tracks.keys.length - 1 > 0) page++;
                            else page--;
                            tracks.splice(page, 1);
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

    } while (!closed)
}

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has("ManageRoles"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
