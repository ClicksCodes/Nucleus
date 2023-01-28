import type { CommandInteraction, GuildMember, SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../utils/client.js";


const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("tracks")
        .setDescription("Manage the tracks for the server")


const callback = async (interaction: CommandInteraction) => {

    

}

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has("ManageRoles"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
