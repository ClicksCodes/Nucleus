import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import verify from "../reflex/verify.js";

const command = new SlashCommandBuilder().setName("verify").setDescription("Get verified in the server");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    interaction.reply("boo")
    verify(interaction);
};

const check = (_interaction: CommandInteraction) => {
    return true;
};

export { command };
export { callback };
export { check };
