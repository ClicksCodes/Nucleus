import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("close")
    .setDescription("Closes a ticket")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [ticket/close]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };