import { ActionRowBuilder, APIMessageComponentEmoji, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, GuildMember, Role, RoleSelectMenuBuilder, RoleSelectMenuInteraction, UserSelectMenuBuilder, UserSelectMenuInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../utils/client.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

const listToAndMore = (list: string[], max: number) => {
    // PineappleFan, Coded, Mini (and 10 more)
    if(list.length > max) {
        return list.slice(0, max).join(", ") + ` (and ${list.length - max} more)`;
    }
    return list.join(", ");
}

const { renderUser } = client.logger;

const canEdit = (role: Role, member: GuildMember, me: GuildMember): [string, boolean] => {
    if(role.position >= me.roles.highest.position ||
       role.position >= member.roles.highest.position
    ) return [`~~<@&${role.id}>~~`, false];
    return [`<@&${role.id}>`, true];
};

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("role")
        .setDescription("Gives or removes a role from someone")
        .addUserOption((option) => option.setName("user").setDescription("The user to give or remove the role from"))

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const m = await interaction.reply({ embeds: LoadingEmbed, fetchReply: true, ephemeral: true });

    let member = interaction.options.getMember("user") as GuildMember | null;

    if(!member) {
        let memberEmbed = new EmojiEmbed()
            .setTitle("Role")
            .setDescription(`Please choose a member to edit the roles of.`)
            .setEmoji("GUILD.ROLES.CREATE")
            .setStatus("Success");
        let memberChooser = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("memberChooser")
                .setPlaceholder("Select a member")
        );
        await interaction.editReply({embeds: [memberEmbed], components: [memberChooser]});

        const filter = (i: UserSelectMenuInteraction) => i.customId === "memberChooser" && i.user.id === interaction.user.id;

        let i: UserSelectMenuInteraction | null;
        try {
            i = await m.awaitMessageComponent<5>({ filter, time: 300000});
        } catch (e) {
            return;
        }

        if(!i) return;
        memberEmbed.setDescription(`Editing roles for ${renderUser(i.values[0]!)}`);
        await i.deferUpdate();
        await interaction.editReply({ embeds: LoadingEmbed, components: [] })
        member = await interaction.guild?.members.fetch(i.values[0]!)!;

    }

    let closed = false;
    let rolesToChange: string[] = [];
    const roleAdd = new ActionRowBuilder<RoleSelectMenuBuilder>()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId("roleAdd")
                .setPlaceholder("Select a role to add")
                .setMaxValues(25)
        );

    do {
        const embed = new EmojiEmbed()
        .setTitle("Role")
        .setDescription(
            `${getEmojiByName("ICONS.EDIT")} Editing roles for <@${member.id}>\n\n` +
            `Adding:\n` +
            `${listToAndMore(rolesToChange.filter((r) => !member!.roles.cache.has(r)).map((r) => canEdit(interaction.guild?.roles.cache.get(r)!, interaction.member as GuildMember, interaction.guild?.members.me!)[0]) || ["None"], 5)}\n` +
            `Removing:\n` +
            `${listToAndMore(rolesToChange.filter((r) => member!.roles.cache.has(r)).map((r) => canEdit(interaction.guild?.roles.cache.get(r)!, interaction.member as GuildMember, interaction.guild?.members.me!)[0]) || ["None"], 5)}\n`
        )
        .setEmoji("GUILD.ROLES.CREATE")
        .setStatus("Success");

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("roleSave")
                    .setLabel("Apply")
                    .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("roleDiscard")
                    .setLabel("Reset")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.editReply({ embeds: [embed], components: [roleAdd, buttons] });

        let i: RoleSelectMenuInteraction | ButtonInteraction | null;
        try {
            i = await m.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: 300000 }) as RoleSelectMenuInteraction | ButtonInteraction;
        } catch (e) {
            return;
        }

        if(!i) return;
        i.deferUpdate();
        if(i.isButton()) {
            switch(i.customId) {
                case "roleSave":
                    const roles = rolesToChange.map((r) => interaction.guild?.roles.cache.get(r)!);
                    await interaction.editReply({ embeds: LoadingEmbed, components: [] });
                    let rolesToAdd: Role[] = [];
                    let rolesToRemove: Role[] = [];
                    for(const role of roles) {
                        if(!canEdit(role, interaction.member as GuildMember, interaction.guild?.members.me!)[1]) continue;
                        if(member.roles.cache.has(role.id)) {
                            rolesToRemove.push(role);
                        } else {
                            rolesToAdd.push(role);
                        }
                    }
                    await member.roles.add(rolesToAdd);
                    await member.roles.remove(rolesToRemove);
                    rolesToChange = [];
                    break;
                case "roleDiscard":
                    rolesToChange = [];
                    await interaction.editReply({ embeds: LoadingEmbed, components: [] });
                    break;
            }
        } else {
            rolesToChange = i.values;
        }

    } while (!closed);

};

const check = (interaction: CommandInteraction, partial: boolean = false) => {
    const member = interaction.member as GuildMember;
    // Check if the user has manage_roles permission
    if (!member.permissions.has("ManageRoles")) return "You do not have the *Manage Roles* permission";
    if (partial) return true;
    if (!interaction.guild) return
    const me = interaction.guild.members.me!;
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
