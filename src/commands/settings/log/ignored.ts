import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("ignored")
    .setDescription("Gets the ignored users, channels and roles")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("This command is not yet finished [settings/log/ignored]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };