import { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import { ChannelType } from 'discord-api-types';

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("tickets")
    .setDescription("Shows settings for tickets")
    .addStringOption(option => option.setName("enabled").setDescription("If users should be able to create tickets | Default yes").setRequired(false)
        .addChoices([["Yes", "yes"], ["No", "no"]]))
    .addChannelOption(option => option.setName("category").setDescription("The category where tickets are created").addChannelType(ChannelType.GuildCategory).setRequired(false))
    .addNumberOption(option => option.setName("maxtickets").setDescription("The maximum amount of tickets a user can create | Default 5").setRequired(false).setMinValue(1))
    .addRoleOption(option => option.setName("supportping").setDescription("The role pinged when a ticket is created").setRequired(false))

const callback = (interaction: CommandInteraction) => {
    interaction.reply("This command is not yet finished [settings/tickets]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return interaction.memberPermissions.has("MANAGE_GUILD");
}

export { command };
export { callback };
export { check };