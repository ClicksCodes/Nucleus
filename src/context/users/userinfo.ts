import { ContextMenuCommandBuilder, GuildMember, UserContextMenuCommandInteraction } from "discord.js";
import { userAbout } from "../../commands/user/about.js";

const command = new ContextMenuCommandBuilder().setName("User info");

const callback = async (interaction: UserContextMenuCommandInteraction) => {
    const guild = interaction.guild!;
    let member = interaction.targetMember as GuildMember | null;
    if (!member) member = await guild.members.fetch(interaction.targetId);
    await userAbout(guild, member as GuildMember, interaction);
};

const check = async (interaction: UserContextMenuCommandInteraction) => {
    if (!interaction.inGuild()) return "You must be in a server to use this command.";

    return true;
};

export { command, callback, check };
