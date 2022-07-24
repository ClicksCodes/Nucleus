import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import close from "../../actions/tickets/delete.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("close")
    .setDescription("Closes a ticket")

const callback = async (interaction: CommandInteraction): Promise<any> => {
    await close(interaction);
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };