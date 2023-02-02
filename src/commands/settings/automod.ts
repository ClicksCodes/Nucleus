import type Discord from "discord.js";
import { ActionRowBuilder, AnyComponent, AnyComponentBuilder, AnySelectMenuInteraction, APIMessageComponentEmoji, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelSelectMenuBuilder, ChannelSelectMenuInteraction, CommandInteraction, Guild, GuildMember, GuildTextBasedChannel, MentionableSelectMenuBuilder, Message, Role, RoleSelectMenuBuilder, RoleSelectMenuInteraction, SelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuBuilder, UserSelectMenuInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";


const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("automod").setDescription("Setting for automatic moderation features");


const emojiFromBoolean = (bool: boolean, id?: string) => bool ? getEmojiByName("CONTROL.TICK", id) : getEmojiByName("CONTROL.CROSS", id);

const listToAndMore = (list: string[], max: number) => {
    // PineappleFan, Coded, Mini (and 10 more)
    if(list.length > max) {
        return list.slice(0, max).join(", ") + ` (and ${list.length - max} more)`;
    }
    return list.join(", ");
}

const toSelectMenu = async (interaction: StringSelectMenuInteraction, m: Message, ids: string[], type: "member" | "role" | "channel", title: string): Promise<string[]> => {

    const back = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("back").setLabel("Back").setStyle(ButtonStyle.Secondary).setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji));

    let closed;
    do {
        let render: string[] = []
        let mapped: string[] = [];
        let menu: UserSelectMenuBuilder | RoleSelectMenuBuilder | ChannelSelectMenuBuilder;
        switch(type) {
            case "member":
                menu = new UserSelectMenuBuilder().setCustomId("user").setPlaceholder("Select users").setMaxValues(25);
                mapped = await Promise.all(ids.map(async (id) => { return (await client.users.fetch(id).then(user => user.tag)) || "Unknown User" }));
                render = ids.map(id => client.logger.renderUser(id))
                break;
            case "role":
                menu = new RoleSelectMenuBuilder().setCustomId("role").setPlaceholder("Select roles").setMaxValues(25);
                mapped = await Promise.all(ids.map(async (id) => { return (await interaction.guild!.roles.fetch(id).then(role => role?.name)) || "Unknown Role" }));
                render = ids.map(id => client.logger.renderRole(id, interaction.guild!))
                break;
            case "channel":
                menu = new ChannelSelectMenuBuilder().setCustomId("channel").setPlaceholder("Select channels").setMaxValues(25);
                mapped = await Promise.all(ids.map(async (id) => { return (await interaction.guild!.channels.fetch(id).then(channel => channel?.name)) || "Unknown Channel" }));
                render = ids.map(id => client.logger.renderChannel(id))
                break;
        }
        const removeOptions = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("remove")
                    .setPlaceholder("Remove")
                    .addOptions(mapped.map((name, i) => new StringSelectMenuOptionBuilder().setLabel(name).setValue(ids[i]!)))
                    .setDisabled(ids.length === 0)
            );

        const embed = new EmojiEmbed()
            .setTitle(title)
            .setEmoji(getEmojiByName("GUILD.SETTINGS.GREEN"))
            .setDescription(`Select ${type}s:\n\nCurrent:\n` + (render.length > 0 ? render.join("\n") : "None"))
            .setStatus("Success");
        let components: ActionRowBuilder<
            StringSelectMenuBuilder |
            ButtonBuilder |
            ChannelSelectMenuBuilder |
            UserSelectMenuBuilder |
            RoleSelectMenuBuilder
        >[] = [new ActionRowBuilder<typeof menu>().addComponents(menu)]
        if(ids.length > 0) components.push(removeOptions);
        components.push(back);

        await interaction.editReply({embeds: [embed], components: components})

        let i: AnySelectMenuInteraction | ButtonInteraction;
        try {
            i = await interaction.channel!.awaitMessageComponent({filter: i => i.user.id === interaction.user.id, time: 300000});
        } catch(e) {
            closed = true;
            break;
        }

        if(i.isButton()) {
            await i.deferUpdate();
            if(i.customId === "back") {
                closed = true;
                break;
            }
        } else if(i.isStringSelectMenu()) {
            await i.deferUpdate();
            if(i.customId === "remove") {
                ids = ids.filter(id => id !== (i as StringSelectMenuInteraction).values[0]);
                if(ids.length === 0) {
                    menu.data.disabled = true;
                }
            }
        } else {
            await i.deferUpdate();
            if(i.customId === "user") {
                ids = ids.concat((i as UserSelectMenuInteraction).values);
            } else if(i.customId === "role") {
                ids = ids.concat((i as RoleSelectMenuInteraction).values);
            } else if(i.customId === "channel") {
                ids = ids.concat((i as ChannelSelectMenuInteraction).values);
            }
        }

    } while(!closed)
    return ids;
}

const imageMenu = async (interaction: StringSelectMenuInteraction, m: Message, current: {
    NSFW: boolean,
    size: boolean
}): Promise<{NSFW: boolean, size: boolean}> => {
    let closed = false;
    do {
        const options = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("nsfw")
                    .setLabel("NSFW")
                    .setStyle(current.NSFW ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(emojiFromBoolean(current.NSFW, "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("size")
                    .setLabel("Size")
                    .setStyle(current.size ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(emojiFromBoolean(current.size, "id") as APIMessageComponentEmoji)
            )

        const embed = new EmojiEmbed()
            .setTitle("Image Settings")
            .setDescription(
                `${emojiFromBoolean(current.NSFW)} **NSFW**\n` +
                `${emojiFromBoolean(current.size)} **Size**\n`
            )

        await interaction.editReply({embeds: [embed], components: [options]});

        let i: ButtonInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => interaction.user.id === i.user.id && i.message.id === m.id, time: 300000}) as ButtonInteraction;
        } catch (e) {
            return current;
        }
        await i.deferUpdate();
        switch(i.customId) {
            case "back":
                closed = true;
                break;
            case "nsfw":
                current.NSFW = !current.NSFW;
                break;
            case "size":
                current.size = !current.size;
                break;
        }
    } while(!closed);
    return current;
}

const wordMenu = async (interaction: StringSelectMenuInteraction, m: Message, current: {
    enabled: boolean,
    words: {strict: string[], loose: string[]},
    allowed: {users: string[], roles: string[], channels: string[]}
}): Promise<{
    enabled: boolean,
    words: {strict: string[], loose: string[]},
    allowed: {users: string[], roles: string[], channels: string[]}
}> => {
    let closed = false;
    do {
        closed = true;
    } while(!closed);
    return current;
}

const inviteMenu = async (interaction: StringSelectMenuInteraction, m: Message, current: {
    enabled: boolean,
    allowed: {users: string[], roles: string[], channels: string[]}
}): Promise<{
    enabled: boolean,
    allowed: {users: string[], roles: string[], channels: string[]}
}> => {

    let closed = false;
    do {
        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("enabled")
                    .setLabel(current.enabled ? "Enabled" : "Disabled")
                    .setStyle(current.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(emojiFromBoolean(current.enabled, "id") as APIMessageComponentEmoji)
            );
        const menu = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("toEdit")
                        .setPlaceholder("Edit your allow list")
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel("Users")
                                .setDescription("Users that are allowed to send invites")
                                .setValue("users"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("Roles")
                                .setDescription("Roles that are allowed to send invites")
                                .setValue("roles"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("Channels")
                                .setDescription("Channels that anyone is allowed to send invites in")
                                .setValue("channels")
                        ).setDisabled(!current.enabled)
                )

        const embed = new EmojiEmbed()
            .setTitle("Invite Settings")
            .setDescription(
                "Automatically deletes invites sent by users (outside of staff members and self promotion channels)" + `\n\n` +
                `${emojiFromBoolean(current.enabled)} **${current.enabled ? "Enabled" : "Disabled"}**\n\n` +
                `**Users:** ` + listToAndMore(current.allowed.users.map(user => `> <@${user}>`), 5) + `\n` +
                `**Roles:** ` + listToAndMore(current.allowed.roles.map(role => `> <@&${role}>`), 5) + `\n` +
                `**Channels:** ` + listToAndMore(current.allowed.channels.map(channel => `> <#${channel}>`), 5)
            )
            .setStatus("Success")
            .setEmoji("GUILD.SETTINGS.GREEN")


        await interaction.editReply({embeds: [embed], components: [buttons, menu]});

        let i: ButtonInteraction | StringSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => interaction.user.id === i.user.id && i.message.id === m.id, time: 300000}) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            return current;
        }

        if(i.isButton()) {
            await i.deferUpdate();
            switch(i.customId) {
                case "back":
                    closed = true;
                    break;
                case "enabled":
                    current.enabled = !current.enabled;
                    break;
            }
        } else {
            await i.deferUpdate();
            switch(i.values[0]) {
                case "users":
                    current.allowed.users = await toSelectMenu(interaction, m, current.allowed.users, "member", "Invite Settings");
                    break;
                case "roles":
                    current.allowed.roles = await toSelectMenu(interaction, m, current.allowed.roles, "role", "Invite Settings");
                    break;
                case "channels":
                    current.allowed.channels = await toSelectMenu(interaction, m, current.allowed.channels, "channel", "Invite Settings");
                    break;
            }
        }

    } while(!closed);
    return current;
}

const mentionMenu = async (interaction: StringSelectMenuInteraction, m: Message, current: {
    mass: number,
    everyone: boolean,
    roles: boolean,
    allowed: {
        roles: string[],
        rolesToMention: string[],
        users: string[],
        channels: string[]
    }
}): Promise<{
    mass: number,
    everyone: boolean,
    roles: boolean,
    allowed: {
        roles: string[],
        rolesToMention: string[],
        users: string[],
        channels: string[]
    }
}> => {
    let closed = false;

    do {
        closed = true;
    } while(!closed);
    return current
}

const callback = async (interaction: CommandInteraction): Promise<void> => {
    if (!interaction.guild) return;
    const m = await interaction.reply({embeds: LoadingEmbed, fetchReply: true, ephemeral: true});
    const config = (await client.database.guilds.read(interaction.guild.id)).filters;

    let closed = false;

    const button = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("save")
                .setLabel("Save")
                .setStyle(ButtonStyle.Success)
        )

    do {

        const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("filter")
                    .setPlaceholder("Select a filter to edit")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Invites")
                            .setDescription("Automatically delete messages containing server invites")
                            .setValue("invites"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Mentions")
                            .setDescription("Deletes messages with excessive mentions")
                            .setValue("mentions"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Words")
                            .setDescription("Delete messages containing filtered words")
                            .setValue("words"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Malware")
                            .setDescription("Automatically delete files and links containing malware")
                            .setValue("malware"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Images")
                            .setDescription("Checks performed on images (NSFW, size checking, etc.)")
                            .setValue("images")
                    )
            );

        const embed = new EmojiEmbed()
            .setTitle("Automod Settings")
            .setDescription(
                `${emojiFromBoolean(config.invite.enabled)} **Invites**\n` +
                `${emojiFromBoolean(config.pings.everyone || config.pings.mass > 0 || config.pings.roles)} **Mentions**\n` +
                `${emojiFromBoolean(config.wordFilter.enabled)} **Words**\n` +
                `${emojiFromBoolean(config.malware)} **Malware**\n` +
                `${emojiFromBoolean(config.images.NSFW || config.images.size)} **Images**\n`
            )
            .setStatus("Success")
            .setEmoji("GUILD.SETTINGS.GREEN")


        await interaction.editReply({embeds: [embed], components: [selectMenu, button]});

        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => i.user.id === interaction.user.id && i.message.id === m.id, time: 300000}) as StringSelectMenuInteraction | ButtonInteraction;
        } catch (e) {
            closed = true;
            return;
        }
        if(!i) return;
        if(i.isButton()) {
            await i.deferUpdate();
            await client.database.guilds.write(interaction.guild.id, {filters: config});
        } else {
            switch(i.values[0]) {
                case "invites":
                    await i.deferUpdate();
                    config.invite = await inviteMenu(i, m, config.invite);
                    break;
                case "mentions":
                    await i.deferUpdate();
                    config.pings = await mentionMenu(i, m, config.pings);
                    break;
                case "words":
                    await i.deferUpdate();
                    config.wordFilter = await wordMenu(i, m, config.wordFilter);
                    break;
                case "malware":
                    await i.deferUpdate();
                    config.malware = !config.malware;
                    break;
                case "images":
                    let next = await imageMenu(i, m, config.images);
                    if(next) config.images = next;
                    break;
            }
        }

    } while(!closed)

};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageMessages"))
        return "You must have the *Manage Messages* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };