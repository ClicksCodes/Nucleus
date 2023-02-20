import type Discord from "discord.js";
import { ActionRowBuilder,
    AnySelectMenuInteraction,
    APIMessageComponentEmoji,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelSelectMenuInteraction,
    CommandInteraction,
    Message,
    ModalBuilder,
    RoleSelectMenuBuilder,
    RoleSelectMenuInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder,
    UserSelectMenuInteraction
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import listToAndMore from "../../utils/listToAndMore.js";


const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("automod").setDescription("Setting for automatic moderation features");


const emojiFromBoolean = (bool: boolean, id?: string) => bool ? getEmojiByName("CONTROL.TICK", id) : getEmojiByName("CONTROL.CROSS", id);

const toSelectMenu = async (interaction: StringSelectMenuInteraction, m: Message, ids: string[], type: "member" | "role" | "channel", title: string): Promise<string[]> => {

    const back = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("back").setLabel("Back").setStyle(ButtonStyle.Secondary).setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji));
    let closed;
    do {
        let render: string[] = []
        let mapped: string[] = [];
        let menu: UserSelectMenuBuilder | RoleSelectMenuBuilder | ChannelSelectMenuBuilder;
        switch(type) {
            case "member": {
                menu = new UserSelectMenuBuilder().setCustomId("user").setPlaceholder("Select users").setMaxValues(25);
                mapped = await Promise.all(ids.map(async (id) => { return (await client.users.fetch(id).then(user => user.tag)) || "Unknown User" }));
                render = ids.map(id => client.logger.renderUser(id))
                break;
            }
            case "role": {
                menu = new RoleSelectMenuBuilder().setCustomId("role").setPlaceholder("Select roles").setMaxValues(25);
                mapped = await Promise.all(ids.map(async (id) => { return (await interaction.guild!.roles.fetch(id).then(role => role?.name ?? "Unknown Role"))}));
                render = ids.map(id => client.logger.renderRole(id, interaction.guild!))
                break;
            }
            case "channel": {
                menu = new ChannelSelectMenuBuilder().setCustomId("channel").setPlaceholder("Select channels").setMaxValues(25);
                mapped = await Promise.all(ids.map(async (id) => { return (await interaction.guild!.channels.fetch(id).then(channel => channel?.name ?? "Unknown Role")) }));
                render = ids.map(id => client.logger.renderChannel(id))
                break;
            }
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
        const components: ActionRowBuilder<
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
            i = await m.awaitMessageComponent({filter: i => i.user.id === interaction.user.id, time: 300000});
        } catch(e) {
            closed = true;
            continue;
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
            case "back": {
                closed = true;
                break;
            }
            case "nsfw": {
                current.NSFW = !current.NSFW;
                break;
            }
            case "size": {
                current.size = !current.size;
                break;
            }
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
        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("enabled")
                    .setLabel("Enabled")
                    .setStyle(current.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(emojiFromBoolean(current.enabled, "id") as APIMessageComponentEmoji),
            );

        const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("edit")
                    .setPlaceholder("Edit... ")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Words")
                            .setDescription("Edit your list of words to filter")
                            .setValue("words"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Allowed Users")
                            .setDescription("Users who will be unaffected by the word filter")
                            .setValue("allowedUsers"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Allowed Roles")
                            .setDescription("Roles that will be unaffected by the word filter")
                            .setValue("allowedRoles"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Allowed Channels")
                            .setDescription("Channels where the word filter will not apply")
                            .setValue("allowedChannels")
                    )
                    .setDisabled(!current.enabled)
            );

        const embed = new EmojiEmbed()
            .setTitle("Word Filters")
            .setDescription(
                `${emojiFromBoolean(current.enabled)} **Enabled**\n` +
                `**Strict Words:** ${listToAndMore(current.words.strict, 5)}\n` +
                `**Loose Words:** ${listToAndMore(current.words.loose, 5)}\n\n` +
                `**Users:** ` + listToAndMore(current.allowed.users.map(user => `<@${user}>`), 5) + `\n` +
                `**Roles:** ` + listToAndMore(current.allowed.roles.map(role => `<@&${role}>`), 5) + `\n` +
                `**Channels:** ` + listToAndMore(current.allowed.channels.map(channel => `<#${channel}>`), 5)
            )
            .setStatus("Success")
            .setEmoji("GUILD.SETTINGS.GREEN")

        await interaction.editReply({embeds: [embed], components: [selectMenu, buttons]});

        let i: ButtonInteraction | StringSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => interaction.user.id === i.user.id && i.message.id === m.id, time: 300000}) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            closed = true;
            break;
        }

        if(i.isButton()) {
            await i.deferUpdate();
            switch(i.customId) {
                case "back": {
                    closed = true;
                    break;
                }
                case "enabled": {
                    current.enabled = !current.enabled;
                    break;
                }
            }
        } else {
            switch(i.values[0]) {
                case "words": {
                    await interaction.editReply({embeds: [new EmojiEmbed()
                        .setTitle("Word Filter")
                        .setDescription("Modal opened. If you can't see it, click back and try again.")
                        .setStatus("Success")
                        .setEmoji("GUILD.SETTINGS.GREEN")
                    ], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
                        .setLabel("Back")
                        .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("back")
                    )]})
                    const modal = new ModalBuilder()
                        .setTitle("Word Filter")
                        .setCustomId("wordFilter")
                        .addComponents(
                            new ActionRowBuilder<TextInputBuilder>()
                                .addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("wordStrict")
                                        .setLabel("Strict Words")
                                        .setPlaceholder("Matches anywhere in the message, including surrounded by other characters")
                                        .setValue(current.words.strict.join(", "))
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setRequired(false)
                                ),
                            new ActionRowBuilder<TextInputBuilder>()
                                .addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("wordLoose")
                                        .setLabel("Loose Words")
                                        .setPlaceholder("Matches only if the word is by itself, surrounded by spaces or punctuation")
                                        .setValue(current.words.loose.join(", "))
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setRequired(false)
                                )
                        )

                    await i.showModal(modal);
                    let out;
                    try {
                        out = await modalInteractionCollector(m, interaction.user);
                    } catch (e) {
                        break;
                    }
                    if (!out) break;
                    if(out.isButton()) break;
                    current.words.strict = out.fields.getTextInputValue("wordStrict")
                        .split(",").map(s => s.trim()).filter(s => s.length > 0);
                    current.words.loose = out.fields.getTextInputValue("wordLoose")
                        .split(",").map(s => s.trim()).filter(s => s.length > 0);
                    break;
                }
                case "allowedUsers": {
                    await i.deferUpdate();
                    current.allowed.users = await toSelectMenu(interaction, m, current.allowed.users, "member", "Word Filter");
                    break;
                }
                case "allowedRoles": {
                    await i.deferUpdate();
                    current.allowed.roles = await toSelectMenu(interaction, m, current.allowed.roles, "role", "Word Filter");
                    break;
                }
                case "allowedChannels": {
                    await i.deferUpdate();
                    current.allowed.channels = await toSelectMenu(interaction, m, current.allowed.channels, "channel", "Word Filter");
                    break;
                }
            }
        }
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
                `**Users:** ` + listToAndMore(current.allowed.users.map(user => `<@${user}>`), 5) + `\n` +
                `**Roles:** ` + listToAndMore(current.allowed.roles.map(role => `<@&${role}>`), 5) + `\n` +
                `**Channels:** ` + listToAndMore(current.allowed.channels.map(channel => `<#${channel}>`), 5)
            )
            .setStatus("Success")
            .setEmoji("GUILD.SETTINGS.GREEN")


        await interaction.editReply({embeds: [embed], components: [menu, buttons]});

        let i: ButtonInteraction | StringSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => interaction.user.id === i.user.id && i.message.id === m.id, time: 300000}) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            return current;
        }

        if(i.isButton()) {
            await i.deferUpdate();
            switch(i.customId) {
                case "back": {
                    closed = true;
                    break;
                }
                case "enabled": {
                    current.enabled = !current.enabled;
                    break;
                }
            }
        } else {
            await i.deferUpdate();
            switch(i.values[0]) {
                case "users": {
                    current.allowed.users = await toSelectMenu(interaction, m, current.allowed.users, "member", "Invite Settings");
                    break;
                }
                case "roles": {
                    current.allowed.roles = await toSelectMenu(interaction, m, current.allowed.roles, "role", "Invite Settings");
                    break;
                }
                case "channels": {
                    current.allowed.channels = await toSelectMenu(interaction, m, current.allowed.channels, "channel", "Invite Settings");
                    break;
                }
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

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("everyone")
                    .setLabel(current.everyone ? "Everyone" : "No one")
                    .setStyle(current.everyone ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(emojiFromBoolean(current.everyone, "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("roles")
                    .setLabel(current.roles ? "Roles" : "No roles")
                    .setStyle(current.roles ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(emojiFromBoolean(current.roles, "id") as APIMessageComponentEmoji)
            );
        const menu = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("toEdit")
                    .setPlaceholder("Edit mention settings")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Mass Mention Amount")
                            .setDescription("The amount of mentions before the bot will delete the message")
                            .setValue("mass"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Roles")
                            .setDescription("Roles that are able to be mentioned")
                            .setValue("roles"),
                    )
            )

        const allowedMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("allowed")
                    .setPlaceholder("Edit exceptions")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                                .setLabel("Users")
                                .setDescription("Users that are unaffected by the mention filter")
                                .setValue("users"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("Roles")
                                .setDescription("Roles that are unaffected by the mention filter")
                                .setValue("roles"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("Channels")
                                .setDescription("Channels where anyone is unaffected by the mention filter")
                                .setValue("channels")
                    )
            )

        const embed = new EmojiEmbed()
            .setTitle("Mention Settings")
            .setDescription(
                `Log when members mention:\n` +
                `${emojiFromBoolean(true)} **${current.mass}+ members** in one message\n` +
                `${emojiFromBoolean(current.everyone)} **Everyone**\n` +
                `${emojiFromBoolean(current.roles)} **Roles**\n` +
                (current.allowed.rolesToMention.length > 0 ? `> *Except for ${listToAndMore(current.allowed.rolesToMention.map(r => `<@&${r}>`), 3)}*\n` : "") +
                "\n" +
                `Except if...\n` +
                `> ${current.allowed.users.length > 0 ? `Member is: ${listToAndMore(current.allowed.users.map(u => `<@${u}>`), 3)}\n` : ""}` +
                `> ${current.allowed.roles.length > 0 ? `Member has role: ${listToAndMore(current.allowed.roles.map(r => `<@&${r}>`), 3)}\n` : ""}` +
                `> ${current.allowed.channels.length > 0 ? `In channel: ${listToAndMore(current.allowed.channels.map(c => `<#${c}>`), 3)}\n` : ""}`
            )
            .setStatus("Success")
            .setEmoji("GUILD.SETTINGS.GREEN")

        await interaction.editReply({embeds: [embed], components: [menu, allowedMenu, buttons]});

        let i: ButtonInteraction | StringSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => interaction.user.id === i.user.id && i.message.id === m.id, time: 300000}) as ButtonInteraction | StringSelectMenuInteraction;
        } catch (e) {
            closed = true;
            break;
        }

        if(i.isButton()) {
            await i.deferUpdate();
            switch (i.customId) {
                case "back": {
                    closed = true;
                    break;
                }
                case "everyone": {
                    current.everyone = !current.everyone;
                    break;
                }
                case "roles": {
                    current.roles = !current.roles;
                    break;
                }
            }
        } else {
            switch (i.customId) {
                case "toEdit": {
                    switch (i.values[0]) {
                        case "mass": {
                            await interaction.editReply({embeds: [new EmojiEmbed()
                                .setTitle("Word Filter")
                                .setDescription("Modal opened. If you can't see it, click back and try again.")
                                .setStatus("Success")
                                .setEmoji("GUILD.SETTINGS.GREEN")
                            ], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
                                .setLabel("Back")
                                .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                .setStyle(ButtonStyle.Primary)
                                .setCustomId("back")
                            )]})
                            const modal = new ModalBuilder()
                                .setTitle("Mass Mention Amount")
                                .setCustomId("mass")
                                .addComponents(
                                    new ActionRowBuilder<TextInputBuilder>()
                                        .addComponents(
                                            new TextInputBuilder()
                                                .setCustomId("mass")
                                                .setPlaceholder("Amount")
                                                .setMinLength(1)
                                                .setMaxLength(3)
                                                .setStyle(TextInputStyle.Short)
                                        )
                                )
                            await i.showModal(modal);
                            let out;
                            try {
                                out = await modalInteractionCollector(m, interaction.user);
                            } catch (e) {
                                break;
                            }
                            if (!out) break;
                            if(out.isButton()) break;
                            current.mass = parseInt(out.fields.getTextInputValue("mass"));
                            break;
                        }
                        case "roles": {
                            await i.deferUpdate();
                            current.allowed.rolesToMention = await toSelectMenu(interaction, m, current.allowed.rolesToMention, "role", "Mention Settings");
                            break;
                        }
                    }
                    break;
                }
                case "allowed": {
                    await i.deferUpdate();
                    switch (i.values[0]) {
                        case "users": {
                            current.allowed.users = await toSelectMenu(interaction, m, current.allowed.users, "member", "Mention Settings");
                            break;
                        }
                        case "roles": {
                            current.allowed.roles = await toSelectMenu(interaction, m, current.allowed.roles, "role", "Mention Settings");
                            break;
                        }
                        case "channels": {
                            current.allowed.channels = await toSelectMenu(interaction, m, current.allowed.channels, "channel", "Mention Settings");
                            break;
                        }
                    }
                    break;
                }
            }
        }

    } while(!closed);
    return current
}

const cleanMenu = async (interaction: StringSelectMenuInteraction, m: Message, current?: {
    channels?: string[],
    allowed?: {
        roles: string[],
        user: string[]
    }
}): Promise<{
    channels: string[],
    allowed: {
        roles: string[],
        user: string[]
    }
}> => {
    let closed = false;
    if(!current) current = {channels: [], allowed: {roles: [], user: []}};
    if(!current.channels) current.channels = [];
    if(!current.allowed) current.allowed = {roles: [], user: []};

    const channelMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("toAdd")
                .setPlaceholder("Select a channel")
        )

    const allowedMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("allowed")
                .setPlaceholder("Edit exceptions")
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                            .setLabel("Users")
                            .setDescription("Users that are unaffected by the mention filter")
                            .setValue("users"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Roles")
                            .setDescription("Roles that are unaffected by the mention filter")
                            .setValue("roles")
                )
        )

    do {

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
            )

        const embed = new EmojiEmbed()
            .setTitle("Clean Settings")
            .setEmoji("GUILD.SETTINGS.GREEN")
            .setDescription(
                `Current clean channels:\n\n` +
                `${current.channels.length > 0 ? listToAndMore(current.channels.map(c => `<#${c}>`), 10) : "None"}\n\n`
            )
            .setStatus("Success")


        await interaction.editReply({embeds: [embed], components: [channelMenu, allowedMenu, buttons]});

        let i: ButtonInteraction | ChannelSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => interaction.user.id === i.user.id && i.message.id === m.id, time: 300000}) as ButtonInteraction | ChannelSelectMenuInteraction;
        } catch (e) {
            closed = true;
            break;
        }
        await i.deferUpdate();
        if(i.isButton()) {
            switch (i.customId) {
                case "back": {
                    closed = true;
                    break;
                }
            }
        } else {
            switch (i.customId) {
                case "toAdd": {
                    const channelEmbed = new EmojiEmbed()
                        .setTitle("Clean Settings")
                        .setDescription(`Editing <#${i.values[0]}>`)
                        .setEmoji("GUILD.SETTINGS.GREEN")
                        .setStatus("Success")
                    const channelButtons = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("back")
                                .setLabel("Back")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(getEmojiByName("CONTROL.LEFT", "id")),
                            new ButtonBuilder()
                                .setCustomId("switch")
                                .setLabel(current.channels.includes(i.values[0]!) ? "Remove" : "Add")
                                .setStyle(current.channels.includes(i.values[0]!) ? ButtonStyle.Danger : ButtonStyle.Success)
                        )

                    await i.editReply({embeds: [channelEmbed], components: [channelButtons]});
                    let j: ButtonInteraction;
                    try {
                        j = await m.awaitMessageComponent({filter: (i) => interaction.user.id === i.user.id && i.message.id === m.id, time: 300000}) as ButtonInteraction;
                    } catch (e) {
                        closed = true;
                        break;
                    }
                    await j.deferUpdate();
                    switch (j.customId) {
                        case "back": {
                            break;
                        }
                        case "switch": {
                            if(current.channels.includes(i.values[0]!)) {
                                current.channels.splice(current.channels.indexOf(i.values[0]!), 1);
                            } else {
                                current.channels.push(i.values[0]!);
                            }
                        }
                    }
                    break;
                }
                case "allowed": {
                    switch (i.values[0]) {
                        case "users": {
                            current.allowed.user = await toSelectMenu(interaction, m, current.allowed.user, "member", "Mention Settings");
                            break;
                        }
                        case "roles": {
                            current.allowed.roles = await toSelectMenu(interaction, m, current.allowed.roles, "role", "Mention Settings");
                            break;
                        }
                    }
                    break;
                }
            }
        }

    } while(!closed);

    return current as {
        channels: string[],
        allowed: {
            roles: string[],
            user: string[]
        }
    };

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
                            .setValue("images"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Clean")
                            .setDescription("Automatically delete new messages in specific channels")
                            .setValue("clean")
                    )
            );

        const embed = new EmojiEmbed()
            .setTitle("Automod Settings")
            .setDescription(
                `${emojiFromBoolean(config.invite.enabled)} **Invites**\n` +
                `${emojiFromBoolean(config.pings.everyone || config.pings.mass > 0 || config.pings.roles)} **Mentions**\n` +
                `${emojiFromBoolean(config.wordFilter.enabled)} **Words**\n` +
                `${emojiFromBoolean(config.malware)} **Malware**\n` +
                `${emojiFromBoolean(config.images.NSFW || config.images.size)} **Images**\n` +
                `${emojiFromBoolean(config.clean.channels.length > 0)} **Clean**\n`
            )
            .setStatus("Success")
            .setEmoji("GUILD.SETTINGS.GREEN")


        await interaction.editReply({embeds: [embed], components: [selectMenu, button]});

        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            i = await m.awaitMessageComponent({filter: (i) => i.user.id === interaction.user.id && i.message.id === m.id, time: 300000}) as StringSelectMenuInteraction | ButtonInteraction;
        } catch (e) {
            closed = true;
            continue;
        }
        await i.deferUpdate();
        if(i.isButton()) {
            await client.database.guilds.write(interaction.guild.id, {filters: config});
        } else {
            switch(i.values[0]) {
                case "invites": {
                    config.invite = await inviteMenu(i, m, config.invite);
                    break;
                }
                case "mentions": {
                    config.pings = await mentionMenu(i, m, config.pings);
                    break;
                }
                case "words": {
                    config.wordFilter = await wordMenu(i, m, config.wordFilter);
                    break;
                }
                case "malware": {
                    config.malware = !config.malware;
                    break;
                }
                case "images": {
                    const next = await imageMenu(i, m, config.images);
                    config.images = next;
                    break;
                }
                case "clean": {
                    const next = await cleanMenu(i, m, config.clean);
                    config.clean = next;
                    break;
                }
            }
        }

    } while(!closed);
    await interaction.deleteReply()

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
