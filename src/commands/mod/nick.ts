import { LinkWarningFooter } from "./../../utils/defaults.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    CommandInteraction,
    GuildMember,
    ButtonStyle,
    Message,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";
import { areTicketsEnabled, create } from "../../actions/createModActionTicket.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("nick")
        .setDescription("Changes a users nickname")
        .addUserOption((option) => option.setName("user").setDescription("The user to change").setRequired(true))
        .addStringOption((option) =>
            option.setName("name").setDescription("The name to set | Leave blank to clear").setRequired(false)
        );

const callback = async (
    interaction: CommandInteraction | ButtonInteraction,
    member?: GuildMember
): Promise<unknown> => {
    const { log, NucleusColors, entry, renderDelta, renderUser } = client.logger;
    let newNickname;
    if (!interaction.isButton()) {
        member = interaction.options.getMember("user") as GuildMember;
        newNickname = interaction.options.get("name")?.value as string | undefined;
    }
    if (!member) return;
    // TODO:[Modals] Replace this with a modal
    let notify = false;
    let confirmation;
    let timedOut = false;
    let success = false;
    let createAppealTicket = false;
    let firstRun = !interaction.isButton();
    do {
        confirmation = await new confirmationMessage(interaction)
            .setEmoji("PUNISH.NICKNAME.RED")
            .setTitle("Nickname")
            .setDescription(
                keyValueList({
                    user: renderUser(member.user),
                    "new nickname": `${newNickname ? newNickname : "*No nickname*"}`
                }) + `Are you sure you want to ${newNickname ? "change" : "clear"} <@!${member.id}>'s nickname?`
            )
            .setColor("Danger")
            .addCustomBoolean(
                "appeal",
                "Create appeal ticket",
                !(await areTicketsEnabled(interaction.guild!.id)),
                async () => await create(interaction.guild!, member!.user, interaction.user, "Nickname changed"),
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
            .addModal(
                "Change nickname",
                "ICONS.EDIT",
                "modal",
                { default: newNickname ?? "" },
                new ModalBuilder().setTitle("Editing nickname").addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("default")
                            .setLabel("Nickname")
                            .setMaxLength(32)
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                            .setValue(newNickname ? newNickname : " ")
                    )
                )
            )
            .setFailedMessage("No changes were made", "Success", "PUNISH.NICKNAME.GREEN")
            .send(!firstRun);
        firstRun = false;
        if (confirmation.cancelled) timedOut = true;
        else if (confirmation.success !== undefined) success = true;
        else if (confirmation.components) {
            notify = confirmation.components["notify"]!.active;
            createAppealTicket = confirmation.components["appeal"]!.active;
        }
        if (confirmation.modals) newNickname = confirmation.modals![0]!.values["default"];
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
                            `Your nickname was ${newNickname ? "changed" : "cleared"} in ${interaction.guild!.name}.` +
                                (newNickname ? `\nIt is now: ${newNickname}` : "") +
                                "\n\n" +
                                (createAppealTicket
                                    ? `You can appeal this in the ticket created in <#${
                                          confirmation.components!["appeal"]!.response
                                      }>`
                                    : "")
                        )
                        .setStatus("Danger")
                ],
                components: []
            };
            if (config.moderation.nick.text && config.moderation.nick.link) {
                messageData.embeds[0]!.setFooter(LinkWarningFooter);
                messageData.components.push(
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel(config.moderation.nick.text)
                            .setURL(config.moderation.nick.link.replaceAll("{id}", member.id))
                    )
                );
            }
            dmMessage = await member.send(messageData);
            dmSent = true;
        }
    } catch {
        dmSent = false;
    }
    let before: string | null;
    try {
        before = member.nickname;
        await member.setNickname(newNickname ?? null, "Nucleus Nickname command");
        await client.database.history.create(
            "nickname",
            interaction.guild!.id,
            member.user,
            interaction.user,
            null,
            before,
            newNickname
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
            member: entry(member.id, renderUser(member.user)),
            before: entry(before, before ?? "*No nickname set*"),
            after: entry(newNickname ?? null, newNickname ?? "*No nickname set*"),
            updated: entry(Date.now(), renderDelta(Date.now())),
            updatedBy: entry(interaction.user.id, renderUser(interaction.user))
        },
        separate: {
            end:
                getEmojiByName("ICONS.NOTIFY." + (notify ? "ON" : "OFF")) +
                ` The user was ${notify ? "" : "not "}notified`
        },
        hidden: {
            guild: interaction.guild!.id
        }
    };
    await log(data);
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

const check = (interaction: CommandInteraction | ButtonInteraction, partial: boolean, target?: GuildMember) => {
    const member = interaction.member as GuildMember;
    // Check if the user has manage_nicknames permission
    if (!member.permissions.has("ManageNicknames")) return "You do not have the *Manage Nicknames* permission";
    if (partial) return true;
    const me = interaction.guild!.members.me!;
    let apply: GuildMember;
    if (interaction.isButton()) {
        apply = target!;
    } else {
        apply = interaction.options.getMember("user") as GuildMember;
    }
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
    longDescription:
        "Changes the nickname of a member. This is the name that shows in the member list and on messages.",
    premiumOnly: true
};
