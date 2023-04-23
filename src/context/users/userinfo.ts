import { ContextMenuCommandBuilder, GuildMember, UserContextMenuCommandInteraction } from "discord.js";
import { userAbout } from "../../commands/user/about.js";

const command = new ContextMenuCommandBuilder().setName("User info");

const callback = async (interaction: UserContextMenuCommandInteraction) => {
    try {
        console.log("getting user info")
        const guild = interaction.guild!;
        let member = interaction.targetMember as GuildMember | null;
        if (!member) member = await guild.members.fetch(interaction.targetId);
        await userAbout(guild, member as GuildMember, interaction);
    } catch (e) { console.log(e) }
};

const check = async (_interaction: UserContextMenuCommandInteraction) => {
    return true;
};

export { command, callback, check };
