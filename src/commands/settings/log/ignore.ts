import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("ignore")
    .setDescription("Sets which users, channels and roles should be ignored")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("Command incomplete [settings/log/ignore]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };