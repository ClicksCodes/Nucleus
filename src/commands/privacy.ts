import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = new SlashCommandBuilder()
    .setName("privacy")
    .setDescription("Shows info about Nucleus' privacy options")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [privacy]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };