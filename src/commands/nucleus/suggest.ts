import { LoadingEmbed } from './../../utils/defaultEmbeds.js';
import { ButtonStyle, CommandInteraction } from "discord.js";
import Discord from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import getEmojiByName from '../../utils/getEmojiByName.js';

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("suggest")
        .setDescription("Sends a suggestion to the developers")
        .addStringOption((option) =>
            option.setName("suggestion").setDescription("The suggestion to send").setRequired(true)
        );

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await interaction.guild?.members.fetch(interaction.member!.user.id)
    const { renderUser } = client.logger;
    const suggestion = interaction.options.get("suggestion")?.value as string;
    await interaction.reply({embeds: LoadingEmbed, ephemeral: true})
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("ICONS.OPP.ADD")
        .setTitle("Suggest")
        .setDescription(
            `**Suggestion:**\n> ${suggestion}\n` +
                "Your username and ID will also be sent with your suggestion.\n\nAre you sure you want to send this suggestion?"
        )
        .setColor("Danger")
        .setInverted(true)
        .send(true);
    if (confirmation.cancelled) return;
    if (confirmation.success) {
        await (client.channels.cache.get("955161206459600976") as Discord.TextChannel).send({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Suggestion")
                    .setDescription(
                        `**From:** ${renderUser(interaction.member!.user as Discord.User)}\n**Suggestion:**\n> ${suggestion}\n\n` +
                        `**Server:** ${interaction.guild!.name} (${interaction.guild!.id})\n`,
                    )
                    .setStatus("Warning")
            ], components: [new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId("suggestionAccept")
                    .setLabel("Accept")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("ICONS.ADD", "id")),
                new Discord.ButtonBuilder()
                    .setCustomId("suggestionDeny")
                    .setLabel("Delete")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("ICONS.REMOVE", "id"))
            )]
        });
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("ICONS.ADD")
                    .setTitle("Suggest")
                    .setDescription("Your suggestion was sent successfully")
                    .setStatus("Success")
            ],
            components: []
        });
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("ICONS.OPP.ADD")
                    .setTitle("Suggest")
                    .setDescription("No changes were made")
                    .setStatus("Danger")
            ],
            components: []
        });
    }
};

const check = (_interaction: CommandInteraction) => {
    return true;
};

export { command };
export { callback };
export { check };
