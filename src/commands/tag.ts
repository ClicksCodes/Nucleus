import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Get and manage the servers tags")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [tag]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };