import type { CommandInteraction, GuildMember, User } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("unban")
        .setDescription("Unbans a user")
        .addStringOption((option) =>
            option.setName("user").setDescription("The user to unban (Username or ID)").setRequired(true)
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const bans = await interaction.guild.bans.fetch();
    const user = interaction.options.get("user")?.value as string;
    let resolved = bans.find((ban) => ban.user.id === user);
    if (!resolved) resolved = bans.find((ban) => ban.user.username.toLowerCase() === user.toLowerCase());
    if (!resolved) resolved = bans.find((ban) => ban.user.tag.toLowerCase() === user.toLowerCase());
    if (!resolved) {
        return interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Unban")
                    .setDescription(`Could not find any user called \`${user}\``)
                    .setEmoji("PUNISH.UNBAN.RED")
                    .setStatus("Danger")
            ],
            ephemeral: true
        });
    }
    // TODO:[Modals] Replace this with a modal
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("PUNISH.UNBAN.RED")
        .setTitle("Unban")
        .setDescription(
            keyValueList({
                user: `${resolved.user.username} [<@${resolved.user.id}>]`
            }) + `Are you sure you want to unban <@${resolved.user.id}>?`
        )
        .setColor("Danger")
        .send();
    if (confirmation.cancelled) return;
    if (confirmation.success) {
        try {
            await interaction.guild.members.unban(resolved.user as User, "Unban");
            const member = resolved.user as User;
            await client.database.history.create("unban", interaction.guild.id, member, interaction.user, "No reason provided");
            const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
            const data = {
                meta: {
                    type: "memberUnban",
                    displayName: "Member Unbanned",
                    calculateType: "guildMemberPunish",
                    color: NucleusColors.green,
                    emoji: "PUNISH.BAN.GREEN",
                    timestamp: Date.now()
                },
                list: {
                    memberId: entry(member.id, `\`${member.id}\``),
                    name: entry(member.id, renderUser(member)),
                    unbanned: entry(Date.now(), renderDelta(Date.now())),
                    unbannedBy: entry(interaction.user.id, renderUser(interaction.user)),
                    accountCreated: entry(member.createdTimestamp, renderDelta(member.createdTimestamp))
                },
                hidden: {
                    guild: interaction.guild.id
                }
            };
            log(data);
        } catch {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.UNBAN.RED")
                        .setTitle("Unban")
                        .setDescription("Something went wrong and the user was not unbanned")
                        .setStatus("Danger")
                ],
                components: []
            });
        }
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.UNBAN.GREEN")
                    .setTitle("Unban")
                    .setDescription("The member was unbanned")
                    .setStatus("Success")
            ],
            components: []
        });
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.UNBAN.GREEN")
                    .setTitle("Unban")
                    .setDescription("No changes were made")
                    .setStatus("Success")
            ],
            components: []
        });
    }
};

const check = (interaction: CommandInteraction, partial: boolean = false) => {
    if (!interaction.guild) return;
    const member = interaction.member as GuildMember;
    // Check if the user has ban_members permission
    if (!member.permissions.has("BanMembers")) return "You do not have the *Ban Members* permission";
    if (partial) return true;
    const me = interaction.guild.members.me!;
    // Check if Nucleus can unban members
    if (!me.permissions.has("BanMembers")) return "I do not have the *Ban Members* permission";
    // Allow the owner to unban anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Allow unban
    return true;
};

export { command, callback, check };
