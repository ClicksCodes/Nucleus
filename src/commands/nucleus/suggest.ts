import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("suggest")
    .setDescription("Sends a suggestion to the developers")
    .addStringOption(option => option.setName("suggestion").setDescription("The suggestion to send").setRequired(true))

const callback = async (interaction: CommandInteraction) => {
	// @ts-ignore
    const { renderUser } = interaction.client.logger
	let suggestion = interaction.options.getString("suggestion");
    let confirmation = await new confirmationMessage(interaction)
        .setEmoji("ICONS.OPP.ADD")
        .setTitle("Suggest")
        .setDescription(`**Suggestion:**\n> ${suggestion}\n`
        + `Your username and ID will also be sent with your suggestion.\n\nAre you sure you want to send this suggestion?`)
        .setColor("Danger")
    .send()
    if (confirmation.success) {
        await (interaction.client.channels.cache.get('955161206459600976') as Discord.TextChannel).send({
			embeds: [
				new generateEmojiEmbed()
					.setTitle(`Suggestion`)
					.setDescription(`**From:** ${renderUser(interaction.member.user)}\n**Suggestion:**\n> ${suggestion}`)
					.setStatus("Danger")
					.setEmoji("NUCLEUS.LOGO")
			]
		})
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji("ICONS.ADD")
            .setTitle(`Suggest`)
            .setDescription("Your suggestion was sent successfully")
            .setStatus("Success")
        ], components: []})
    } else {
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji("ICONS.OPP.ADD")
            .setTitle(`Suggest`)
            .setDescription("No changes were made")
            .setStatus("Danger")
        ], components: []})
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };