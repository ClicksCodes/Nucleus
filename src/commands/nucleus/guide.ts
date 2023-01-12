import type { CommandInteraction } from 'discord.js';
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import guide from "../../reflex/guide.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("guide").setDescription("Shows the welcome guide for the bot");

const callback = async (interaction: CommandInteraction) => {
    guide(interaction.guild!, interaction);
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
