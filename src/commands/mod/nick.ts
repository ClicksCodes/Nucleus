import { LinkWarningFooter } from './../../utils/defaults.js';
import { ActionRowBuilder, ButtonBuilder, CommandInteraction, GuildMember, ButtonStyle, Message } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";
import { areTicketsEnabled, create } from "../../actions/createModActionTicket.js";
import getEmojiByName from "../../utils/getEmojiByName.js";


const command = (builder: SlashCommandSubcommandBuilder) => builder
    .setName("nick")
    // .setNameLocalizations({"ru": "name", "zh-CN": "nickname"})
    .setDescription("Changes a users nickname")
    .addUserOption((option) => option.setName("user").setDescription("The user to change").setRequired(true))
    .addStringOption((option) =>
        option.setName("name").setDescription("The name to set | Leave blank to clear").setRequired(false)
    );


const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const { log, NucleusColors, entry, renderDelta, renderUser } = client.logger;
    // TODO:[Modals] Replace this with a modal
    let notify = true;
    let confirmation;
    let timedOut = false;
    let success = false;
    let createAppealTicket = false;
    let firstRun = true;
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.NICKNAME.RED")
            .setTitle("Nickname")
            .setDescription(
                keyValueList({
                    user: renderUser(interaction.options.getUser("user")!),
                    "new nickname": `${
                        interaction.options.get("name")?.value as string ? interaction.options.get("name")?.value as string : "*No nickname*"
                    }`
                }) +
                    `Are you sure you want to ${interaction.options.get("name")?.value as string ? "change" : "clear"} <@!${
                        (interaction.options.getMember("user") as GuildMember).id
                    }>'s nickname?`
            )
            .setColor("Danger")
            .addCustomBoolean(
                "appeal",
                "Create appeal ticket",
                !(await areTicketsEnabled(interaction.guild!.id)),
                async () => await create(interaction.guild!, interaction.options.getUser("user")!, interaction.user, "Nickname changed"),
                "An appeal ticket will be created",
                null,
                "CONTROL.TICKET",
                createAppealTicket
            )
            .addCustomBoolean(
                "notify",
                "Notify user",
                false,
                null,
                "The user will be sent a DM",
                null,
                "ICONS.NOTIFY." + (notify ? "ON" : "OFF"),
                notify
            )
            .setFailedMessage("No changes were made", "Success", "PUNISH.NICKNAME.GREEN")
            .send(!firstRun);
        firstRun = false;
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) success = true;
        else if (confirmation.components) {
            notify = confirmation.components['notify']!.active;
            createAppealTicket = confirmation.components["appeal"]!.active;
        }
    } while (!timedOut && !success);
    if (timedOut || !success) return;
    let dmSent = false;
    let dmMessage: Message;
    const config = await client.database.guilds.read(interaction.guild!.id);
    try {
        if (notify) {
            const messageData: {
                embeds: EmojiEmbed[];
                components: ActionRowBuilder<ButtonBuilder>[];
            } = {
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("PUNISH.NICKNAME.RED")
                        .setTitle("Nickname changed")
                        .setDescription(
                            `Your nickname was ${interaction.options.get("name")?.value as string ? "changed" : "cleared"} in ${
                                interaction.guild!.name
                            }.` +
                                (interaction.options.get("name")?.value as string
                                    ? ` it is now: ${interaction.options.get("name")?.value as string}`
                                    : "") +
                                "\n\n" +
                                (createAppealTicket
                                    ? `You can appeal this in the ticket created in <#${confirmation.components!["appeal"]!.response}>`
                                    : "")
                        )
                        .setStatus("Danger")
                ], components: []
            };
            if (config.moderation.nick.text && config.moderation.nick.link) {
                messageData.embeds[0]!.setFooter(LinkWarningFooter)
                messageData.components.push(new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel(config.moderation.nick.text)
                            .setURL(config.moderation.nick.link.replaceAll("{id}", (interaction.options.getMember("user") as GuildMember).id))
                        )
                )
            }
            dmMessage = await (interaction.options.getMember("user") as GuildMember).send(messageData);
            dmSent = true;
        }
    } catch {
        dmSent = false;
    }
    let member: GuildMember;
    let before: string | null;
    let nickname: string | undefined;
    try {
        member = interaction.options.getMember("user") as GuildMember;
        before = member.nickname;
        nickname = interaction.options.get("name")?.value as string | undefined;
        member.setNickname(nickname ?? null, "Nucleus Nickname command");
        await client.database.history.create(
            "nickname",
            interaction.guild!.id,
            member.user,
            interaction.user,
            null,
            before,
            nickname
        );
    } catch {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("PUNISH.NICKNAME.RED")
                    .setTitle("Nickname")
                    .setDescription("Something went wrong and the users nickname could not be changed.")
                    .setStatus("Danger")
            ],
            components: []
        });
        if (dmSent) await dmMessage!.delete();
        return;
    }
    const data = {
        meta: {
            type: "memberUpdate",
            displayName: "Member Updated",
            calculateType: "guildMemberUpdate",
            color: NucleusColors.yellow,
            emoji: "PUNISH.NICKNAME.YELLOW",
            timestamp: Date.now()
        },
        list: {
            memberId: entry(member.id, `\`${member.id}\``),
            before: entry(before, before ?? "*No nickname set*"),
            after: entry(nickname ?? null, nickname ?? "*No nickname set*"),
            updated: entry(Date.now(), renderDelta(Date.now())),
            updatedBy: entry(interaction.user.id, renderUser(interaction.user))
        },
        separate: {
            end: getEmojiByName("ICONS.NOTIFY." + (notify ? "ON" : "OFF")) + ` The user was ${notify ? "" : "not "}notified`
        },
        hidden: {
            guild: interaction.guild!.id
        }
    };
    log(data);
    const failed = !dmSent && notify;
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setEmoji(`PUNISH.NICKNAME.${failed ? "YELLOW" : "GREEN"}`)
                .setTitle("Nickname")
                .setDescription(
                    "The members nickname was changed" +
                        (failed ? ", but was not notified" : "") +
                        (confirmation.components!["appeal"]!.response !== null
                            ? ` and an appeal ticket was opened in <#${confirmation.components!["appeal"]!.response}>`
                            : "")
                )
                .setStatus(failed ? "Warning" : "Success")
        ],
        components: []
    });
};

const check = async (interaction: CommandInteraction, partial: boolean = false) => {
    const member = interaction.member as GuildMember;
    // Check if the user has manage_nicknames permission
    if (!member.permissions.has("ManageNicknames")) return "You do not have the *Manage Nicknames* permission";
    if (partial) return true;
    const me = interaction.guild!.members.me!;
    const apply = interaction.options.getMember("user") as GuildMember;
    const memberPos = member.roles.cache.size ? member.roles.highest.position : 0;
    const mePos = me.roles.cache.size ? me.roles.highest.position : 0;
    const applyPos = apply.roles.cache.size ? apply.roles.highest.position : 0;
    if (!interaction.guild) return false;
    // Do not allow any changing of the owner
    if (member.id === interaction.guild.ownerId) return "You cannot change the owner's nickname";
    // Check if Nucleus can change the nickname
    if (!(mePos > applyPos)) return `I do not have a role higher than <@${apply.id}>`;
    // Check if Nucleus has permission to change the nickname
    if (!me.permissions.has("ManageNicknames")) return "I do not have the *Manage Nicknames* permission";
    // Allow the owner to change anyone's nickname
    if (member.id === interaction.guild.ownerId) return true;
    // Allow changing your own nickname
    if (member === apply) return true;
    // Check if the user is below on the role list
    if (!(memberPos > applyPos)) return `You do not have a role higher than <@${apply.id}>`;
    // Allow change
    return true;
};

export { command, callback, check };
export const metadata = {
    longDescription: "Changes the nickname of a member. This is the name that shows in the member list and on messages.",
    premiumOnly: true,
}
