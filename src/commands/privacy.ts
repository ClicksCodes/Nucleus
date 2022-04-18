import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import { testLink, testMalware, testNSFW } from '../utils/scanners.js';

const command = new SlashCommandBuilder()
    .setName("privacy")
    .setDescription("we changed the fucking charger again!")
    .addStringOption(option => option.setName("link").setDescription("fuck you").setRequired(false))

const callback = async (interaction: CommandInteraction) => {
    console.log(await testLink(interaction.options.getString("link")))
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };