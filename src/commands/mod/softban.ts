import { CommandInteraction, GuildMember, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";
import addPlural from "../../utils/plurals.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("softban")
        .setDescription("Kicks a user and deletes their messages")
        .addUserOption(option => option.setName("user").setDescription("The user to softban").setRequired(true))
        .addIntegerOption(option => option.setName("delete").setDescription("The days of messages to delete | Default: 0").setMinValue(0).setMaxValue(7).setRequired(false));

const callback = async (interaction: CommandInteraction): Promise<any> => {
    const { renderUser } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let reason = null;
    let notify = true;
    let confirmation;
    while (true) {
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.BAN.RED")
            .setTitle("Softban")
            .setDescription(keyValueList({
                "user": renderUser(interaction.options.getUser("user")),
                "reason": reason ? ("\n> " + ((reason ?? "").replaceAll("\n", "\n> "))) : "*No reason provided*"
            })
            + `The user **will${notify ? "" : " not"}** be notified\n`
            + `${addPlural(interaction.options.getInteger("delete") ? interaction.options.getInteger("delete") : 0, "day")} of messages will be deleted\n\n`
            + `Are you sure you want to softban <@!${(interaction.options.getMember("user") as GuildMember).id}>?`)
            .setColor("Danger")
            .addCustomBoolean("notify", "Notify user", false, null, null, "ICONS.NOTIFY." + (notify ? "ON" : "OFF" ), notify)
            .addReasonButton(reason ?? "")
            .send(reason !== null);
        reason = reason ?? "";
        if (confirmation.cancelled) return;
        if (confirmation.success) break;
        if (confirmation.newReason) reason = confirmation.newReason;
        if (confirmation.components) {
            notify = confirmation.components.notify.active;
        }
    }
    if (confirmation.success) {
        let dmd = false;
        const config = await client.database.guilds.read(interaction.guild.id);
        try {
            if (notify) {
                await (interaction.options.getMember("user") as GuildMember).send({
                    embeds: [new EmojiEmbed()
                        .setEmoji("PUNISH.BAN.RED")
                        .setTitle("Softbanned")
                        .setDescription(`You have been softbanned from ${interaction.guild.name}` +
                                    (reason ? ` for:\n> ${reason}` : "."))
                        .setStatus("Danger")
                    ],
                    components: [new MessageActionRow().addComponents(config.moderation.ban.text ? [new MessageButton()
                        .setStyle("LINK")
                        .setLabel(config.moderation.ban.text)
                        .setURL(config.moderation.ban.link)
                    ] : [])]
                });
                dmd = true;
            }
        } catch { dmd = false;}
        const member = (interaction.options.getMember("user") as GuildMember);
        try {
            await member.ban({
                days: Number(interaction.options.getInteger("delete") ?? 0),
                reason: reason
            });
            await interaction.guild.members.unban(member, "Softban");
        } catch {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("PUNISH.BAN.RED")
                .setTitle("Softban")
                .setDescription("Something went wrong and the user was not softbanned")
                .setStatus("Danger")
            ], components: []});
        }
        await client.database.history.create("softban", interaction.guild.id, member.user, reason);
        const failed = (dmd === false && notify);
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji(`PUNISH.BAN.${failed ? "YELLOW" : "GREEN"}`)
            .setTitle("Softban")
            .setDescription("The member was softbanned" + (failed ? ", but could not be notified" : ""))
            .setStatus(failed ? "Warning" : "Success")
        ], components: []});
    } else {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setEmoji("PUNISH.BAN.GREEN")
            .setTitle("Softban")
            .setDescription("No changes were made")
            .setStatus("Success")
        ], components: []});
    }
};

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    const member = (interaction.member as GuildMember);
    const me = (interaction.guild.me as GuildMember);
    const apply = (interaction.options.getMember("user") as GuildMember);
    if (member === null || me === null || apply === null) throw "That member is not in the server";
    const memberPos = member.roles ? member.roles.highest.position : 0;
    const mePos = me.roles ? me.roles.highest.position : 0;
    const applyPos = apply.roles ? apply.roles.highest.position : 0;
    // Do not allow softbanning the owner
    if (member.id === interaction.guild.ownerId) throw "You cannot softban the owner of the server";
    // Check if Nucleus can ban the member
    if (! (mePos > applyPos)) throw "I do not have a role higher than that member";
    // Check if Nucleus has permission to ban
    if (!me.permissions.has("BAN_MEMBERS")) throw "I do not have the *Ban Members* permission";
    // Do not allow softbanning Nucleus
    if (member.id === me.id) throw "I cannot softban myself";
    // Allow the owner to softban anyone
    if (member.id === interaction.guild.ownerId) return true;
    // Check if the user has ban_members permission
    if (! member.permissions.has("BAN_MEMBERS")) throw "You do not have the *Ban Members* permission";
    // Check if the user is below on the role list
    if (! (memberPos > applyPos)) throw "You do not have a role higher than that member";
    // Allow softban
    return true;
};

export { command, callback, check };