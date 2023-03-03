import type Discord from "discord.js";
import type { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("create")
        .setDescription("Creates a tag")
        .addStringOption((o) => o.setName("name").setRequired(true).setDescription("The name of the tag"))
        .addStringOption((o) =>
            o.setName("value").setRequired(true).setDescription("The value of the tag, shown after running /tag name")
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const name = interaction.options.get("name")?.value as string;
    const value = interaction.options.get("value")?.value as string;
    if (name!.length > 100)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Create")
                    .setDescription("Tag names cannot be longer than 100 characters")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    if (value!.length > 1000)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Create")
                    .setDescription("Tag values cannot be longer than 1000 characters")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    const data = await client.database.guilds.read(interaction.guild!.id);
    if (Object.keys(data.tags).length >= 100)
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Create")
                    .setDescription("You cannot have more than 100 tags")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    if (data.tags[name])
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Create")
                    .setDescription("That tag already exists")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.NICKNAME.YELLOW")
        .setTitle("Tag create")
        .setDescription(
            keyValueList({
                name: `${name}`,
                value: `\n> ${value}`
            }) + "\nAre you sure you want to create this tag?"
        )
        .setColor("Warning")
        .setInverted(true)
        .setFailedMessage("No changes were made", "Success", "PUNISH.NICKNAME.GREEN")
        .send();
    if (confirmation.cancelled || !confirmation.success) return;
    try {
        await client.database.guilds.write(interaction.guild!.id, {
            [`tags.${name}`]: value
        });
        await client.memory.forceUpdate(interaction.guild!.id);
    } catch (e) {
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Create")
                    .setDescription("Something went wrong and the tag was not created")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            components: []
        });
    }
    return await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Tag Create")
                .setDescription("Tag created")
                .setStatus("Success")
                .setEmoji("PUNISH.NICKNAME.GREEN")
        ],
        components: []
    });
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
