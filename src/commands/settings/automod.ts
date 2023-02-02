import type Discord from "discord.js";
import { ActionRowBuilder, APIMessageComponentEmoji, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, Message, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("automod").setDescription("Setting for automatic moderation features");


const emojiFromBoolean = (bool: boolean, id?: string) => bool ? getEmojiByName("CONTROL.TICK", id) : getEmojiByName("CONTROL.CROSS", id);


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
    allowed: {user: string[], roles: string[], channels: string[]}
}): Promise<{
    enabled: boolean,
    words: {strict: string[], loose: string[]},
    allowed: {user: string[], roles: string[], channels: string[]}
}> => {

}

const inviteMenu = async (interaction: StringSelectMenuInteraction, m: Message, current: {
    enabled: boolean,
    allowed: {user: string[], roles: string[], channels: string[]}
}): Promise<{
    enabled: boolean,
    allowed: {user: string[], roles: string[], channels: string[]}
}> => {

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
                `${emojiFromBoolean(config.invite.enabled)} **Invites**}\n` +
                `${emojiFromBoolean(config.pings.everyone || config.pings.mass > 0 || config.pings.roles)} **Mentions**\n` +
                `${emojiFromBoolean(config.wordFilter.enabled)} **Words**\n` +
                `${emojiFromBoolean(config.malware)} **Malware**\n` +
                `${emojiFromBoolean(config.images.NSFW || config.images.size)} **Images**}\n`
            )


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
                    break;
                case "mentions":
                    break;
                case "words":
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
