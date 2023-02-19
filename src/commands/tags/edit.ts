import type { CommandInteraction, GuildMember } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("edit")
        .setDescription("Edits or renames a tag")
        .addStringOption((o) => o.setName("name").setRequired(true).setDescription("The tag to edit"))
        .addStringOption((o) =>
            o.setName("value").setRequired(false).setDescription("The new value of the tag / Rename")
        )
        .addStringOption((o) =>
            o.setName("newname").setRequired(false).setDescription("The new name of the tag / Edit")
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const name = interaction.options.get("name")?.value as string;
    const value = interaction.options.get("value")?.value as string ?? "";
    const newname = interaction.options.get("newname")?.value as string ?? "";
    if (!newname && !value)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Edit")
                    .setDescription("You must specify a value or a new name")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    if (newname.length > 100)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Edit")
                    .setDescription("Tag names cannot be longer than 100 characters")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    if (value.length > 2000)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Edit")
                    .setDescription("Tag values cannot be longer than 2000 characters")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    const data = await client.database.guilds.read(interaction.guild.id);
    if (!data.tags[name])
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Edit")
                    .setDescription("That tag does not exist")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    if (newname && newname !== name && data.tags[newname])
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Edit")
                    .setDescription("A tag with that name already exists")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.NICKNAME.YELLOW")
        .setTitle("Tag Edit")
        .setDescription(
            keyValueList({
                name: `${name}` + (newname ? ` -> ${newname}` : ""),
                value: `\n> ${value ? value : data.tags[name]}`
            }) + "\nAre you sure you want to edit this tag?"
        )
        .setColor("Warning")
        .setInverted(true)
        .setFailedMessage("No changes were made", "Success", "PUNISH.NICKNAME.GREEN")
        .send();
    if (confirmation.cancelled) return;
    try {
        const toSet: Record<string, string> = {};
        const toUnset: string[] = [];
        if (value) toSet[`tags.${name}`] = value;
        if (newname) {
            toUnset.push(`tags.${name}`);
            toSet[`tags.${newname}`] = data.tags[name]!;
        }
        await client.database.guilds.write(interaction.guild.id, Object.keys(toSet).length === 0 ? null : toSet, toUnset);
        await client.memory.forceUpdate(interaction.guild!.id);
    } catch (e) {
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Edit")
                    .setDescription("Something went wrong and the tag was not edited")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            components: []
        });
    }
    return await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Tags")
                .setDescription("Tag edited successfully")
                .setStatus("Success")
                .setEmoji("PUNISH.NICKNAME.GREEN")
        ],
        components: []
    });
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has("ManageMessages"))
        return "You must have the *Manage Messages* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
