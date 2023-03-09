import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import verify from "../reflex/verify.js";

const command = new SlashCommandBuilder().setName("verify").setDescription("Get verified in the server");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await verify(interaction);
};

export { command };
export { callback };
