import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("channel")
    .setDescription("Sets the channel for staff messages to go to")

const callback = (interaction: CommandInteraction) => {
    interaction.reply("This command is not yet finished [settings/mod/channel]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };