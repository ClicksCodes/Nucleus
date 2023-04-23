import {
    ContextMenuCommandBuilder,
    GuildMember,
    PermissionFlagsBits,
    UserContextMenuCommandInteraction
} from "discord.js";
import { noteMenu } from "../../commands/mod/about.js";

const command = new ContextMenuCommandBuilder()
    .setName("Flag User")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

const callback = async (interaction: UserContextMenuCommandInteraction) => {
    const guild = interaction.guild!;
    let member = interaction.targetMember as GuildMember | null;
    if (!member) member = await guild.members.fetch(interaction.targetId);
    await noteMenu(member, interaction);
};

const check = async (_interaction: UserContextMenuCommandInteraction) => {
    return true;
};

export { command, callback, check };
