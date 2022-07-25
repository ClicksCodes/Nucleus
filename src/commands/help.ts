import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows help for commands")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("hel p"); // TODO: FINISH THIS FOR RELEASE
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };