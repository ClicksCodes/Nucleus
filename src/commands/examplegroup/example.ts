import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("examplesubcommand")
    .setDescription("An example subcommand")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Hello, world!");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return interaction.user.id !== "123456789";
}

export { command };
export { callback };
export { check };