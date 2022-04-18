import Discord, { CommandInteraction, GuildMember } from "discord.js";
import generateEmojiEmbed from "../utils/generateEmojiEmbed.js";
import readConfig from "../utils/readConfig.js";
import fetch from "node-fetch";
import { TestString, NSFWCheck } from "../automations/unscan.js";

export default async function(interaction) {
    // @ts-ignore
    let verify = interaction.client.verify
    await interaction.reply({embeds: [new generateEmojiEmbed()
        .setTitle("Loading")
        .setStatus("Danger")
        .setEmoji("NUCLEUS.LOADING")
    ], ephemeral: true, fetchReply: true});
    let config = await readConfig(interaction.guild.id);
    if ((interaction.member as GuildMember).roles.cache.has(config.verify.role)) {
        return await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setTitle("Verify")
            .setDescription(`You already have the <@&${config.verify.role}> role`)
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ]});
    }
    await interaction.editReply({embeds: [new generateEmojiEmbed()
        .setTitle("Verify")
        .setDescription(`Checking our servers are up`)
        .setStatus("Warning")
        .setEmoji("NUCLEUS.LOADING")
    ]});
    try {
        let status = await fetch(`https://clicksminuteper.net`).then(res => res.status);
        if (status != 200) {
            return await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setTitle("Verify")
                .setDescription(`Our servers appear to be down, please try again later`)
                .setStatus("Danger")
                .setEmoji("CONTROL.BLOCKCROSS")
            ]});
        }
    } catch {
        return await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setTitle("Verify")
            .setDescription(`Our servers appear to be down, please try again later`)
            .setStatus("Danger")
            .setEmoji("CONTROL.BLOCKCROSS")
        ], components: [new Discord.MessageActionRow().addComponents([
            new Discord.MessageButton()
                .setLabel("Open webpage")
                .setStyle("LINK")
                .setURL("https://clicksminuteper.net/"),
            new Discord.MessageButton()
                .setLabel("Support")
                .setStyle("LINK")
                .setURL("https://discord.gg/bPaNnxe")
        ])]});
    }
    if (config.filters.images.NSFW) {
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setTitle("Verify")
            .setDescription(`Checking your avatar is safe for work`)
            .setStatus("Warning")
            .setEmoji("NUCLEUS.LOADING")
        ]});
        if (await NSFWCheck((interaction.member as GuildMember).user.avatarURL({format: "png"}))) {
            return await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setTitle("Verify")
                .setDescription(`Your avatar was detected as NSFW, which we do not allow in this server.\nPlease contact one of our staff members if you believe this is a mistake`)
                .setStatus("Danger")
                .setEmoji("CONTROL.BLOCKCROSS")
            ]});
        }
    }
    if (config.filters.wordFilter) {
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setTitle("Verify")
            .setDescription(`Checking your name is allowed`)
            .setStatus("Warning")
            .setEmoji("NUCLEUS.LOADING")
        ]});
        if (TestString((interaction.member as Discord.GuildMember).displayName, config.filters.wordFilter.words.loose, config.filters.wordFilter.words.strict) != "none") {
            return await interaction.editReply({embeds: [new generateEmojiEmbed()
                .setTitle("Verify")
                .setDescription(`Your name contained a word we do not allow in this server.\nPlease contact one of our staff members if you believe this is a mistake`)
                .setStatus("Danger")
                .setEmoji("CONTROL.BLOCKCROSS")
            ]});
        }
    }
    await interaction.editReply({embeds: [new generateEmojiEmbed()
        .setTitle("Verify")
        .setDescription(`One moment...`)
        .setStatus("Warning")
        .setEmoji("NUCLEUS.LOADING")
    ]});
    let code = ""
    let length = 5
    let itt = 0
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    while (true) {
        itt += 1
        code = ""
        for (let i = 0; i < length; i++) { code += chars.charAt(Math.floor(Math.random() * chars.length)); }
        if (code in verify) continue;
        if (itt > 1000) {
            itt = 0
            length += 1
            continue
        }
        break;
    }
    verify[code] = {
        uID: interaction.member.user.id,
        gID: interaction.guild.id,
        rName: (await interaction.guild.roles.fetch(config.verify.role)).name,
        mCount: interaction.guild.memberCount,
        gName: interaction.guild.name,
        guildIcon: interaction.guild.iconURL({format: "png"})
    }
    await interaction.editReply({embeds: [new generateEmojiEmbed()
        .setTitle("Verify")
        .setDescription(`Looking good!\nClick the button below to get verified`)
        .setStatus("Success")
        .setEmoji("MEMBER.JOIN")
    ], components: [new Discord.MessageActionRow().addComponents([new Discord.MessageButton()
        .setLabel("Verify")
        .setStyle("LINK")
        .setURL(`https://clicksminuteper.net/nucleus/verify?code=${code}`)
    ])]});
}