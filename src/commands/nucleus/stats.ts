import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("stats")
    .setDescription("Gets the bot's statse")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [nucleus/stats]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };