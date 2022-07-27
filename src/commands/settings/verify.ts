import { LoadingEmbed } from './../../utils/defaultEmbeds.js';
import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("verify")
    .setDescription("Manage the role given after typing /verify")
    .addRoleOption(option => option.setName("role").setDescription("The role to give after verifying").setRequired(false))

const callback = async (interaction: CommandInteraction): Promise<any> => {
    let m;
    m = await interaction.reply({embeds: LoadingEmbed, ephemeral: true, fetchReply: true});
    if (interaction.options.getRole("role")) {
        let role
        try {
            role = interaction.options.getRole("role")
        } catch {
            return await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("GUILD.ROLES.DELETE")
                .setTitle("Verify Role")
                .setDescription("The role you provided is not a valid role")
                .setStatus("Danger")
            ]})
        }
        role = role as Discord.Role
        if (role.guild.id !== interaction.guild.id) {
            return interaction.editReply({embeds: [new EmojiEmbed()
                .setTitle("Verify Role")
                .setDescription(`You must choose a role in this server`)
                .setStatus("Danger")
                .setEmoji("GUILD.ROLES.DELETE")
            ]});
        }
        let confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.ROLES.EDIT")
            .setTitle("Verify Role")
            .setDescription(`Are you sure you want to set the verify role to <@&${role.id}>?`)
            .setColor("Warning")
            .setInverted(true)
        .send(true)
        if (confirmation.cancelled) return
        if (confirmation.success) {
            try {
                await client.database.guilds.write(interaction.guild.id, {"verify.role": role.id, "verify.enabled": true});
                const { log, NucleusColors, entry, renderUser, renderRole } = client.logger
                try {
                    let data = {
                        meta:{
                            type: 'verifyRoleChanged',
                            displayName: 'Ignored Groups Changed',
                            calculateType: 'nucleusSettingsUpdated',
                            color: NucleusColors.green,
                            emoji: "CONTROL.BLOCKTICK",
                            timestamp: new Date().getTime()
                        },
                        list: {
                            memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                            changedBy: entry(interaction.user.id, renderUser(interaction.user)),
                            role: entry(role.id, renderRole(role)),
                        },
                        hidden: {
                            guild: interaction.guild.id
                        }
                    }
                    log(data);
                } catch {}
            } catch (e) {
                console.log(e)
                return interaction.editReply({embeds: [new EmojiEmbed()
                    .setTitle("Verify Role")
                    .setDescription(`Something went wrong while setting the verify role`)
                    .setStatus("Danger")
                    .setEmoji("GUILD.ROLES.DELETE")
                ], components: []});
            }
        } else {
            return interaction.editReply({embeds: [new EmojiEmbed()
                .setTitle("Verify Role")
                .setDescription(`No changes were made`)
                .setStatus("Success")
                .setEmoji("GUILD.ROLES.CREATE")
            ], components: []});
        }
    }
    let clicks = 0;
    let data = await client.database.guilds.read(interaction.guild.id);
    let role = data.verify.role;
    while (true) {
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setTitle("Verify Role")
            .setDescription(role ? `Your verify role is currently set to <@&${role}>` : `You have not set a verify role`)
            .setStatus("Success")
            .setEmoji("GUILD.ROLES.CREATE")
        ], components: [new MessageActionRow().addComponents([
            new MessageButton()
                .setCustomId("clear")
                .setLabel(clicks ? "Click again to confirm" : "Reset role")
                .setEmoji(getEmojiByName(clicks ? "TICKETS.ISSUE" : "CONTROL.CROSS", "id"))
                .setStyle("DANGER")
                .setDisabled(!role)
        ])]});
        let i;
        try {
            i = await m.awaitMessageComponent({time: 300000});
        } catch(e) { break }
        i.deferUpdate()
        if (i.component.customId === "clear") {
            clicks += 1;
            if (clicks === 2) {
                clicks = 0;
                await client.database.guilds.write(interaction.guild.id, null, ["verify.role", "verify.enabled"])
                role = undefined;
            }
        } else {
            break
        }
    }
    await interaction.editReply({embeds: [new EmojiEmbed()
        .setTitle("Verify Role")
        .setDescription(role ? `Your verify role is currently set to <@&${role}}>` : `You have not set a verify role`)
        .setStatus("Success")
        .setEmoji("GUILD.ROLE.CREATE")
        .setFooter({text: "Message closed"})
    ], components: [new MessageActionRow().addComponents([new MessageButton()
        .setCustomId("clear")
        .setLabel("Clear")
        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
        .setStyle("SECONDARY")
        .setDisabled(true),
    ])]});
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as Discord.GuildMember)
    if (!member.permissions.has("MANAGE_GUILD")) throw "You must have the *Manage Server* permission to use this command"
    return true;
}

export { command };
export { callback };
export { check };
