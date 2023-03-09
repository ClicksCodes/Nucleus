import type { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import guide from "../../reflex/guide.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("guide").setDescription("Shows the welcome guide for the bot");

const callback = async (interaction: CommandInteraction) => {
    await guide(interaction.guild!, interaction);
};

export { command };
export { callback };
