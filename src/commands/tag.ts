import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import { callback as statsChannelAdd } from '../automations/statsChannelAdd.js';

const command = new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Get and manage the servers tags")

const callback = (interaction: CommandInteraction) => {
    try { statsChannelAdd(interaction.client, interaction.member); } catch {} // TODO: REMOVE THIS FOR PRODUCTION
    interaction.reply("This command is not yet finished [tag]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };