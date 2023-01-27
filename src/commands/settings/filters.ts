import type Discord from "discord.js";
import type { CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("filter").setDescription("Setting for message filters");

const callback = async (_interaction: CommandInteraction): Promise<void> => {
    console.log("Filters");
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageMessages"))
        return "You must have the *Manage Messages* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
