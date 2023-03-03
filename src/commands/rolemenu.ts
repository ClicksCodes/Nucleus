import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { callback as roleMenu } from "../actions/roleMenu.js";

const command = new SlashCommandBuilder()
    .setName("rolemenu")
    .setDescription("Lets you choose from sets of roles to apply to yourself");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await roleMenu(interaction);
};

export { command };
export { callback };
