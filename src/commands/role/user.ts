import type { CommandInteraction, GuildMember, Role, User } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../utils/client.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("user")
        .setDescription("Gives or removes a role from someone")
        .addUserOption((option) =>
            option.setName("user").setDescription("The member to give or remove the role from").setRequired(true)
        )
        .addRoleOption((option) =>
            option.setName("role").setDescription("The role to give or remove").setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("action")
                .setDescription("The action to perform")
                .setRequired(true)
                .addChoices(
                    {name: "Add", value: "give"},
                    {name: "Remove", value: "remove"}
                )
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const { renderUser, renderRole } = client.logger;
    const action = interaction.options.get("action")?.value as string;
    const role: Role = (await interaction.guild!.roles.fetch(interaction.options.get("role")?.value as string))!;
    // TODO:[Modals] Replace this with a modal
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("GUILD.ROLES.DELETE")
        .setTitle("Role")
        .setDescription(
            keyValueList({
                user: renderUser(interaction.options.getUser("user")! as User),
                role: renderRole(role)
            }) +
                `\nAre you sure you want to ${
                    action === "give" ? "give the role to" : "remove the role from"
                } ${interaction.options.getUser("user")}?`
        )
        .setColor("Danger")
        .setFailedMessage("No changes were made", "Success", "GUILD.ROLES.CREATE")
        .send();
    if (confirmation.cancelled || !confirmation.success) return;
    try {
        const member = interaction.options.getMember("user") as GuildMember;
        if ((interaction.options.get("action")?.value as string) === "give") {
            member.roles.add(role);
        } else {
            member.roles.remove(role);
        }
    } catch (e) {
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Role")
                    .setDescription("Something went wrong and the role could not be added")
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ],
            components: []
        });
    }
    return await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Role")
                .setDescription(`The role has been ${action === "give" ? "given" : "removed"} successfully`)
                .setStatus("Success")
                .setEmoji("GUILD.ROLES.CREATE")
        ],
        components: []
    });
};

const check = (interaction: CommandInteraction, partial: boolean = false) => {
    const member = interaction.member as GuildMember;
    // Check if the user has manage_roles permission
    if (!member.permissions.has("ManageRoles")) return "You do not have the *Manage Roles* permission";
    if (partial) return true;
    if (!interaction.guild) return
    const me = interaction.guild.members.me!;
    const apply = interaction.options.getMember("user") as GuildMember | null;
    if (apply === null) return "That member is not in the server";
    // Check if Nucleus has permission to role
    if (!me.permissions.has("ManageRoles")) return "I do not have the *Manage Roles* permission";
    // Allow the owner to role anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Allow role
    return true;
};

export { command };
export { callback };
export { check };
