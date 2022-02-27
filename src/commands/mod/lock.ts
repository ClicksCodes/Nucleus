import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("lock")
    .setDescription("Manages a lock on a channel")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [mod/lock]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command, callback, check };