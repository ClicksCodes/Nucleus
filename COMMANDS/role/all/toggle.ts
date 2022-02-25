import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("toggle")
    .setDescription("Adds a role to everyone if they don't have it, removes it if they do")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [role/all/toggle]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };