import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("slowmode")
    .setDescription("Manages slowmode in a channel")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("This command is not yet finished [mod/slowmode]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command, callback, check };