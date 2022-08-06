import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("filter").setDescription("Setting for message filters");

const callback = async (_interaction: CommandInteraction): Promise<void> => {
    console.log("Filters");
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_MESSAGES"))
        throw "You must have the *Manage Messages* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
