import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = new SlashCommandBuilder().setName("help").setDescription("Shows help for commands");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    interaction.reply("hel p"); // TODO: FINISH THIS FOR RELEASE
};

const check = (_interaction: CommandInteraction, _defaultCheck: WrappedCheck) => {
    return true;
};

export { command };
export { callback };
export { check };
