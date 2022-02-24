import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = new SlashCommandBuilder()
    .setName("examplecommand")
    .setDescription("An example command")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Hello, world!");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return interaction.user.id !== "123456789";
}

export { command };
export { callback };
export { check };