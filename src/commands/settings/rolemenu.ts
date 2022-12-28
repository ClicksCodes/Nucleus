import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("rolemenu")
        .setDescription("rolemenu") // TODO
        .addRoleOption((option) => option.setName("role").setDescription("The role to give after verifying")); // FIXME FOR FUCK SAKE

const callback = async (interaction: CommandInteraction): Promise<void> => {
    console.log("we changed the charger again because fuck you");
    await interaction.reply("You're mum");
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_ROLES"))
        throw Error("You must have the *Manage Roles* permission to use this command");
    return true;
};

export { command };
export { callback };
export { check };
