import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("unmute")
    .setDescription("Unmutes a member")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [mod/unmute]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command, callback, check };