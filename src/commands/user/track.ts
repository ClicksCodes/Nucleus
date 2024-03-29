import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    CommandInteraction,
    GuildMember,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    APIMessageComponentEmoji,
    StringSelectMenuBuilder,
    MessageComponentInteraction,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import addPlural from "../../utils/plurals.js";
import client from "../../utils/client.js";
import { createVerticalTrack } from "../../utils/createPageIndicator.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("track")
        .setDescription("Moves a user along a role track")
        .addUserOption((option) => option.setName("user").setDescription("The user to manage").setRequired(true));

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const { renderUser, renderRole } = client.logger;
    const member = interaction.options.getMember("user") as GuildMember;
    const guild = interaction.guild;
    if (!guild) return;
    const config = await client.database.guilds.read(guild.id);
    await interaction.reply({ embeds: LoadingEmbed, ephemeral: true });
    let track = 0;
    let generated;
    const roles = await guild.roles.fetch();
    const memberRoles = member.roles;
    let managed: boolean;
    let timedOut = false;
    while (!timedOut) {
        const data = config.tracks[track]!;
        if (data.manageableBy.length)
            managed = data.manageableBy.some((element: string) => {
                return memberRoles.cache.has(element);
            });
        else managed = false;
        const dropdown = new Discord.StringSelectMenuBuilder()
            .addOptions(
                config.tracks.map((option, index) => {
                    const hasRoleInTrack: boolean = option.track.some((element: string) => {
                        return memberRoles.cache.has(element);
                    });
                    return new StringSelectMenuOptionBuilder({
                        default: index === track,
                        label: option.name,
                        value: index.toString(),
                        description: option.track.length === 0 ? "No" : addPlural(option.track.length, "role"),
                        emoji: client.emojis.resolve(
                            getEmojiByName("TRACKS.SINGLE." + (hasRoleInTrack ? "ACTIVE" : "INACTIVE"), "id")
                        ) as APIMessageComponentEmoji
                    });
                })
            )
            .setCustomId("select")
            .setMaxValues(1);
        const allowed: boolean[] = [];
        generated = "**Track:** " + data.name + "\n" + "**Member:** " + renderUser(member.user) + "\n";
        generated +=
            (data.nullable ? "Members do not need a role in this track" : "A role in this track is required") + "\n";
        generated +=
            (data.retainPrevious
                ? "When promoted, the user keeps previous roles"
                : "Members will lose their current role when promoted") + "\n";
        for (const role of data.track) {
            const disabled: boolean =
                roles.get(role)!.position >= (interaction.member as GuildMember).roles.highest.position && !managed;
            allowed.push(!disabled);
        }
        generated +=
            "\n" +
            createVerticalTrack(
                data.track.map((role) => renderRole(roles.get(role)!)),
                data.track.map((role) => memberRoles.cache.has(role)),
                allowed.map((allow) => !allow)
            );
        const selected = [];
        for (const position of data.track) {
            if (memberRoles.cache.has(position)) selected.push(position);
        }
        const conflict = data.retainPrevious ? false : selected.length > 1;
        let conflictDropdown: StringSelectMenuBuilder[] = [];
        const conflictDropdownOptions: StringSelectMenuOptionBuilder[] = [];
        let currentRoleIndex: number = -1;
        if (conflict) {
            generated += `\n\n${getEmojiByName(`PUNISH.WARN.${managed ? "YELLOW" : "RED"}`)} This user has ${
                selected.length
            } roles from this track. `;
            conflictDropdown = [];
            const yourRoles = guild.members.cache.get(interaction.user.id)!.roles;
            if (
                (roles.get(selected[0]!)!.position < yourRoles.highest.position &&
                    roles.get(selected[0]!)!.position < guild.members.me!.roles.highest.position!) ||
                managed
            ) {
                generated +=
                    "In order to promote or demote this user, you must select which role the member should keep.";
                selected.forEach((role) => {
                    conflictDropdownOptions.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(roles.get(role)!.name)
                            .setValue(roles.get(role)!.id)
                    );
                });
                conflictDropdown = [
                    new Discord.StringSelectMenuBuilder()
                        .addOptions(conflictDropdownOptions)
                        .setCustomId("conflict")
                        .setMaxValues(1)
                        .setPlaceholder("Select a role to keep")
                ];
            } else {
                if (roles.get(selected[0]!)!.position >= yourRoles.highest.position) {
                    generated +=
                        "You don't have permission to manage one or more of the user's roles, and therefore can't select one to keep.";
                } else {
                    generated +=
                        "I don't have permission to manage one or more of the user's roles, and therefore can't select one to keep.";
                }
            }
        } else {
            currentRoleIndex = selected.length === 0 ? -1 : data.track.indexOf(selected[0]!.toString());
        }
        const m = (await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("TRACKS.ICON")
                    .setTitle("Tracks")
                    .setDescription(`${generated}`)
                    .setStatus("Success")
            ],
            components: [new ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>().addComponents(dropdown)]
                .concat(
                    conflict && conflictDropdown.length
                        ? [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(conflictDropdown)]
                        : []
                )
                .concat([
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setEmoji(getEmojiByName("CONTROL.UP", "id"))
                            .setLabel("Move up")
                            .setCustomId("promote")
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(
                                conflict ||
                                    currentRoleIndex === 0 ||
                                    (currentRoleIndex === -1 ? false : !allowed[currentRoleIndex - 1])
                            ),
                        new ButtonBuilder()
                            .setEmoji(getEmojiByName("CONTROL.DOWN", "id"))
                            .setLabel("Move down")
                            .setCustomId("demote")
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(
                                conflict ||
                                    (data.nullable
                                        ? currentRoleIndex <= -1
                                        : currentRoleIndex === data.track.length - 1 || currentRoleIndex <= -1) ||
                                    !allowed[currentRoleIndex]
                            )
                    ])
                ])
        })) as Message;
        let component: MessageComponentInteraction;
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
            timedOut = true;
            continue;
        }
        await component.deferUpdate();
        if (component.customId === "conflict") {
            const rolesToRemove = selected.filter(
                (role) => role !== (component as StringSelectMenuInteraction).values[0]
            );

            await member.roles.remove(rolesToRemove);
        } else if (component.customId === "promote") {
            if (
                currentRoleIndex === -1
                    ? allowed[data.track.length - 1]
                    : allowed[currentRoleIndex - 1] && allowed[currentRoleIndex]
            ) {
                if (currentRoleIndex === -1) {
                    await member.roles.add(data.track[data.track.length - 1]!);
                } else if (currentRoleIndex < data.track.length) {
                    if (!data.retainPrevious) await member.roles.remove(data.track[currentRoleIndex]!);
                    await member.roles.add(data.track[currentRoleIndex - 1]!);
                }
            }
        } else if (component.customId === "demote") {
            if (allowed[currentRoleIndex]) {
                if (currentRoleIndex === data.track.length - 1) {
                    if (data.nullable) await member.roles.remove(data.track[currentRoleIndex]!);
                } else if (currentRoleIndex > -1) {
                    await member.roles.remove(data.track[currentRoleIndex]!);
                    await member.roles.add(data.track[currentRoleIndex + 1]!);
                }
            }
        } else if (component.customId === "select") {
            track = parseInt((component as StringSelectMenuInteraction).values[0]!);
        }
    }
};

const check = async (interaction: CommandInteraction, _partial: boolean = false) => {
    const tracks = (await client.database.guilds.read(interaction.guild!.id)).tracks;
    if (tracks.length === 0) return "This server does not have any tracks";
    const member = interaction.member as GuildMember;
    // Allow the owner to promote anyone
    if (member.id === interaction.guild!.ownerId) return true;
    // Check if the user can manage any of the tracks
    let managed = false;
    const memberRoles = member.roles.cache.map((r) => r.id);
    for (const element of tracks) {
        if (!element.manageableBy.length) continue;
        if (!element.manageableBy.some((role: string) => memberRoles.includes(role))) continue;
        managed = true;
        break;
    }
    // Check if the user has manage_roles permission
    if (!managed && !member.permissions.has("ManageRoles")) return "You do not have the *Manage Roles* permission";
    // Allow track
    return true;
};

export { command };
export { callback };
export { check };
