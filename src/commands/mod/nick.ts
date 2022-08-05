import { CommandInteraction, GuildMember } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("nick")
        .setDescription("Changes a users nickname")
        .addUserOption(option => option.setName("user").setDescription("The user to change").setRequired(true))
        .addStringOption(option => option.setName("name").setDescription("The name to set | Leave blank to clear").setRequired(false));

const callback = async (interaction: CommandInteraction): Promise<void | unknown> => {
    const { renderUser } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let notify = true;
    let confirmation;
    while (true) {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.NICKNAME.RED")
            .setTitle("Nickname")
            .setDescription(keyValueList({
                "user": renderUser(interaction.options.getUser("user")),
                "new nickname": `${interaction.options.getString("name") ? interaction.options.getString("name") : "*No nickname*"}`
            })
            + `The user **will${notify ? "" : " not"}** be notified\n\n`
            + `Are you sure you want to ${interaction.options.getString("name") ? "change" : "clear"} <@!${(interaction.options.getMember("user") as GuildMember).id}>'s nickname?`)
            .setColor("Danger")
            .addCustomBoolean("notify", "Notify user", false, null, null, "ICONS.NOTIFY." + (notify ? "ON" : "OFF" ), notify)
            .send(interaction.options.getString("name") !== null);
        if (confirmation.cancelled) return;
        if (confirmation.success) break;
        if (confirmation.components) {
            notify = confirmation.components.notify.active;
        }
    }
    if (confirmation.success) {
        let dmd = false;
        let dm;
        try {
            if (notify) {
                dm = await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.NICKNAME.RED")
                        .setTitle("Nickname changed")
                        .setDescription(`Your nickname was ${interaction.options.getString("name") ? "changed" : "cleared"} in ${interaction.guild.name}.` +
                                    (interaction.options.getString("name") ? ` it is now: ${interaction.options.getString("name")}` : "") + "\n\n" +
                                    (confirmation.components.appeal.response ? `You can appeal this here: <#${confirmation.components.appeal.response}>` : ""))
                        .setStatus("Danger")
                    ]
                });
                dmd = true;
            }
        } catch { dmd = false; }
        try {
            const member = (interaction.options.getMember("user") as GuildMember);
            const before = member.nickname;
            const nickname = interaction.options.getString("name");
            member.setNickname(nickname ?? null, "Nucleus Nickname command");
            await client.database.history.create(
                "nickname", interaction.guild.id, member.user, interaction.user,
                null, before, nickname);
            const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
            const data = {
                meta: {
                    type: "memberUpdate",
                    displayName: "Member Updated",
                    calculateType: "guildMemberUpdate",
                    color: NucleusColors.yellow,
                    emoji: "PUNISH.NICKNAME.YELLOW",
                    timestamp: new Date().getTime()
                },
                list: {
                    memberId: entry(member.id, `\`${member.id}\``),
                    before: entry(before, before ? before : "*None*"),
                    after: entry(nickname, nickname ? nickname : "*None*"),
                    updated: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    updatedBy: entry(interaction.user.id, renderUser(interaction.user))
                },
                hidden: {
                    guild: interaction.guild.id
                }
            };
            log(data);
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.NICKNAME.RED")
                .setTitle("Nickname")
                .setDescription("Something went wrong and the users nickname could not be changed.")
                .setStatus("Danger")
            ], components: []});
            if (dmd) await dm.delete();
            return;
        }
        const failed = (dmd === false && notify);
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji(`PUNISH.NICKNAME.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle("Nickname")
            .setDescription("The members nickname was changed" + (failed ? ", but was not notified" : "") + (confirmation.components.appeal.response ? ` and an appeal ticket was opened in <#${confirmation.components.appeal.response}>` : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []});
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.NICKNAME.GREEN")
            .setTitle("Nickname")
            .setDescription("No changes were made")
            .setStatus("Success")
        ], components: []});
    }
};

const check = (interaction: CommandInteraction) => {
    const member = (interaction.member as GuildMember);
    const me = (interaction.guild.me as GuildMember);
    const apply = (interaction.options.getMember("user") as GuildMember);
    if (member === null || me === null || apply === null) throw "That member is not in the server";
    const memberPos = member.roles ? member.roles.highest.position : 0;
    const mePos = me.roles ? me.roles.highest.position : 0;
    const applyPos = apply.roles ? apply.roles.highest.position : 0;
    // Do not allow any changing of the owner
    if (member.id === interaction.guild.ownerId) throw "You cannot change the owner's nickname";
    // Check if Nucleus can change the nickname
    if (! (mePos > applyPos)) throw "I do not have a role higher than that member";
    // Check if Nucleus has permission to change the nickname
    if (! me.permissions.has("MANAGE_NICKNAMES")) throw "I do not have the *Manage Nicknames* permission";
    // Allow the owner to change anyone's nickname
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has manage_nicknames permission
    if (! member.permissions.has("MANAGE_NICKNAMES")) throw "You do not have the *Manage Nicknames* permission";
    // Allow changing your own nickname
    if (member === apply) return true;
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member";
    // Allow change
    return true;
};

export { command, callback, check };