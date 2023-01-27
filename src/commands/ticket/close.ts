import type { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import close from "../../actions/tickets/delete.js";

const command = (builder: SlashCommandSubcommandBuilder) => builder.setName("close").setDescription("Closes a ticket");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await close(interaction);
};

export { command };
export { callback };
