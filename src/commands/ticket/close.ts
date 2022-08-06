import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import close from "../../actions/tickets/delete.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("close").setDescription("Closes a ticket");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await close(interaction);
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
