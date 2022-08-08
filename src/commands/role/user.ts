import { CommandInteraction, GuildMember, Role } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
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
                .addChoices([
                    ["Add", "give"],
                    ["Remove", "remove"]
                ])
        );

const callback = async (interaction: CommandInteraction): Promise<void | unknown> => {
    const { renderUser, renderRole } = client.logger;
    const action = interaction.options.getString("action");
    // TODO:[Modals] Replace this with a modal
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("GUILD.ROLES.DELETE")
        .setTitle("Role")
        .setDescription(
            keyValueList({
                user: renderUser(interaction.options.getUser("user")),
                role: renderRole(interaction.options.getRole("role"))
            }) +
                `\nAre you sure you want to ${
                    action === "give" ? "give the role to" : "remove the role from"
                } ${interaction.options.getUser("user")}?`
        )
        .setColor("Danger")
        .send();
    if (confirmation.cancelled) return;
    if (confirmation.success) {
        try {
            const member = interaction.options.getMember("user") as GuildMember;
            const role = interaction.options.getRole("role") as Role;
            if (interaction.options.getString("action") === "give") {
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
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("GUILD.ROLES.CREATE")
                    .setTitle("Role")
                    .setDescription("No changes were made.")
                    .setStatus("Danger")
            ],
            components: []
        });
    }
};

const check = (interaction: CommandInteraction, _defaultCheck: WrappedCheck) => {
    const member = interaction.member as GuildMember;
    const me = interaction.guild.me!;
    const apply = interaction.options.getMember("user") as GuildMember;
    if (member === null || me === null || apply === null) throw "That member is not in the server";
    // Check if Nucleus has permission to role
    if (!me.permissions.has("MANAGE_ROLES")) throw "I do not have the *Manage Roles* permission";
    // Allow the owner to role anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has manage_roles permission
    if (!member.permissions.has("MANAGE_ROLES")) throw "You do not have the *Manage Roles* permission";
    // Allow role
    return true;
};

export { command };
export { callback };
export { check };
