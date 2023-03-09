import { LoadingEmbed, unknownServerIcon } from "../utils/defaults.js";
import Discord, {
    CommandInteraction,
    GuildMember,
    MessageComponentInteraction,
    Role,
    ButtonStyle,
    PermissionsBitField,
    ButtonInteraction
} from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import fetch from "node-fetch";
import { TestString, NSFWCheck } from "./scanners.js";
import createPageIndicator from "../utils/createPageIndicator.js";
import client from "../utils/client.js";
import singleNotify from "../utils/singleNotify.js";
import { getCommandMentionByName } from "../utils/getCommandDataByName.js";

export interface VerifySchema {
    uID: string;
    gID: string;
    rID: string;
    rName: string;
    uName: string;
    gName: string;
    gIcon: string;
    interaction: Discord.MessageComponentInteraction;
}

function step(i: number) {
    return "\n\n" + createPageIndicator(5, i);
}

export default async function (interaction: CommandInteraction | ButtonInteraction) {
    const verify = client.verify;
    await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    });
    const config = await client.database.guilds.read(interaction.guild!.id);
    if (!config.verify.enabled || !config.verify.role)
        return interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription("Verify is not enabled on this server")
                    .setFooter({
                        text: (interaction.member!.permissions as PermissionsBitField).has("ManageGuild")
                            ? "You can enable it by running /settings verify"
                            : ""
                    })
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ]
        });
    if ((interaction.member as GuildMember).roles.cache.has(config.verify.role)) {
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription(`You already have the <@&${config.verify.role}> role` + step(0))
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ]
        });
    }
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Verify")
                .setDescription("Checking our servers are up" + step(0))
                .setStatus("Warning")
                .setEmoji("NUCLEUS.LOADING")
        ]
    });
    try {
        const status = await fetch(client.config.baseUrl).then((res) => res.status);
        if (status !== 200) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify")
                        .setDescription("Our servers appear to be down, please try again later" + step(0))
                        .setStatus("Danger")
                        .setEmoji("CONTROL.BLOCKCROSS")
                ]
            });
        }
    } catch {
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription("Our servers appear to be down, please try again later" + step(0))
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ],
            components: [
                new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents([
                    new Discord.ButtonBuilder()
                        .setLabel("Check webpage")
                        .setStyle(ButtonStyle.Link)
                        .setURL(client.config.baseUrl),
                    new Discord.ButtonBuilder()
                        .setLabel("Support")
                        .setStyle(ButtonStyle.Link)
                        .setURL("https://discord.gg/bPaNnxe")
                ])
            ]
        });
    }
    if (config.filters.images.NSFW) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription("Checking your avatar is safe for work" + step(1))
                    .setStatus("Warning")
                    .setEmoji("NUCLEUS.LOADING")
            ]
        });
        if (
            await NSFWCheck(
                (interaction.member as GuildMember).user.displayAvatarURL({ extension: "png", forceStatic: true })
            )
        ) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify")
                        .setDescription(
                            "Your avatar was detected as NSFW, which we do not allow in this server.\nPlease contact a staff members if you believe this is a mistake" +
                                step(1)
                        )
                        .setStatus("Danger")
                        .setEmoji("CONTROL.BLOCKCROSS")
                ]
            });
        }
    }
    if (config.filters.wordFilter.enabled) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription("Checking your name is allowed" + step(2))
                    .setStatus("Warning")
                    .setEmoji("NUCLEUS.LOADING")
            ]
        });
        if (
            TestString(
                (interaction.member as Discord.GuildMember).displayName,
                config.filters.wordFilter.words.loose,
                config.filters.wordFilter.words.strict
            ) !== null
        ) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify")
                        .setDescription(
                            "Your name contained a word we do not allow in this server.\nPlease contact one of our staff members if you believe this is a mistake" +
                                step(2)
                        )
                        .setStatus("Danger")
                        .setEmoji("CONTROL.BLOCKCROSS")
                ]
            });
        }
    }
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Verify")
                .setDescription("One moment..." + step(3))
                .setStatus("Warning")
                .setEmoji("NUCLEUS.LOADING")
        ]
    });
    let code = "";
    let length = 5;
    let itt = 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    do {
        itt++;
        code = "";
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (itt > 1000) {
            itt = 0;
            length++;
        }
    } while (code in verify);
    const role: Role | null = await interaction.guild!.roles.fetch(config.verify.role);
    if (!role) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription(
                        "The server's verify role was deleted, or could not be found. Please contact a staff member to fix this issue." +
                            step(4)
                    )
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ]
        });
        await singleNotify(
            "verifyRoleDeleted",
            interaction.guild!.id,
            `The role given when a member is verified has been deleted. Use ${getCommandMentionByName(
                "settings/verify"
            )} to set a new one`,
            "Critical"
        );
        return;
    }
    verify[code] = {
        uID: interaction.member!.user.id,
        gID: interaction.guild!.id,
        rID: config.verify.role,
        rName: role.name,
        uName: interaction.member!.user.username,
        gName: interaction.guild!.name,
        gIcon: interaction.guild!.iconURL({ extension: "png", size: 256 }) ?? unknownServerIcon,
        interaction: interaction as MessageComponentInteraction
    };
    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Verify")
                .setDescription("Looking good!\nClick the button below to get verified." + step(4))
                .setStatus("Success")
                .setEmoji("MEMBER.JOIN")
        ],
        components: [
            new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents([
                new Discord.ButtonBuilder()
                    .setLabel("Verify")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`${client.config.baseUrl}nucleus/verify?code=${code}`)
            ])
        ]
    });
}
