import { CategoryChannel, CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("viewas")
    .setDescription("View the server as a specific member")
    .addUserOption(option => option.setName("member").setDescription("The member to view as").setRequired(true))

const callback = (interaction: CommandInteraction) => {
    let channels = interaction.guild.channels.cache
        .filter(c => c.type === "GUILD_CATEGORY")
        .map(c => (c as CategoryChannel).children.map(c => c))
    console.log(channels)
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command, callback, check };