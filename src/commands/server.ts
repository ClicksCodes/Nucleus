import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = new SlashCommandBuilder()
    .setName("server")
    .setDescription("Shows info about the server")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [server]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };