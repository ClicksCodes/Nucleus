import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { callback as roleMenu } from "../actions/roleMenu.js";

const command = new SlashCommandBuilder()
    .setName("rolemenu")
    .setDescription("Lets you choose from sets of roles to apply to yourself");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await roleMenu(interaction);
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
