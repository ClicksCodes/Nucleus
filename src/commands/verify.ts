import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import verify from "../reflex/verify.js";

const command = new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Get verified in the server")

const callback = async (interaction: CommandInteraction): Promise<any> => {
    verify(interaction);
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };
