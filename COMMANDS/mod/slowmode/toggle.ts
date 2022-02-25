import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("clear")
    .setDescription("Toggles slowmode in a channel")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [mod/slowmode/toggle]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };