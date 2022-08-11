import type Discord from "discord.js";
import type { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("delete")
        .setDescription("Deletes a tag")
        .addStringOption((o) => o.setName("name").setRequired(true).setDescription("The name of the tag"));

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const name = interaction.options.getString("name");
    const data = await client.database.guilds.read(interaction.guild!.id);
    if (!data.tags[name])
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tags")
                    .setDescription("That tag does not exist")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            ephemeral: true
        });
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.NICKNAME.YELLOW")
        .setTitle("Tag Delete")
        .setDescription(
            keyValueList({
                name: `${name}`,
                value: `\n> ${data.tags[name]}`
            }) + "\nAre you sure you want to delete this tag?"
        )
        .setColor("Warning")
        .setInverted(true)
        .send();
    if (confirmation.cancelled) return;
    if (!confirmation.success)
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Delete")
                    .setDescription("No changes were made")
                    .setStatus("Success")
                    .setEmoji("PUNISH.NICKNAME.GREEN")
            ]
        });
    try {
        await client.database.guilds.write(interaction.guild!.id, null, ["tags." + name]);
    } catch (e) {
        console.log(e);
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Tag Delete")
                    .setDescription("Something went wrong and the tag was not deleted")
                    .setStatus("Danger")
                    .setEmoji("PUNISH.NICKNAME.RED")
            ],
            components: []
        });
    }
    return await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Tag Delete")
                .setDescription("Tag deleted")
                .setStatus("Success")
                .setEmoji("PUNISH.NICKNAME.GREEN")
        ],
        components: []
    });
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_MESSAGES"))
        throw new Error("You must have the *Manage Messages* permission to use this command");
    return true;
};

export { command };
export { callback };
export { check };
