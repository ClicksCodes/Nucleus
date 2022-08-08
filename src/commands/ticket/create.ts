import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import create from "../../actions/tickets/create.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("create")
        .setDescription("Creates a new modmail ticket")
        .addStringOption((option) =>
            option.setName("message").setDescription("The content of the ticket").setRequired(false)
        );

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await create(interaction);
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
