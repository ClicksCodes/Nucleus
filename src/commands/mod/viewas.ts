import Discord, { CategoryChannel, CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";
import { WrappedCheck } from "jshaiku";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("viewas")
    .setDescription("View the server as a specific member")
    .addUserOption(option => option.setName("member").setDescription("The member to view as").setRequired(true))

const callback = async (interaction: CommandInteraction) => {
    let channels = []
    interaction.guild.channels.cache.forEach(channel => {
        if (!channel.parent && channel.type !== "GUILD_CATEGORY") channels.push(channel)
    })
    channels = [channels]
    channels = channels.concat(interaction.guild.channels.cache
        .filter(c => c.type === "GUILD_CATEGORY")
        .map(c => (c as CategoryChannel).children.map(c => c))
    )
    let autoSortBelow = ["GUILD_VOICE", "GUILD_STAGE_VOICE"]
    channels = channels.map(c => c.sort((a, b) => {
        if (autoSortBelow.includes(a.type) && autoSortBelow.includes(b.type)) return a.name.localeCompare(b.name)
        if (autoSortBelow.includes(a.type)) return -1
        if (autoSortBelow.includes(b.type)) return 1
        return a.position - b.position
    }))
    let member = interaction.options.getMember("member") as Discord.GuildMember
    await interaction.reply({embeds: [new generateEmojiEmbed()
        .setEmoji("MEMBER.JOIN")
        .setTitle("Viewing as " + member.displayName)
        .setStatus("Success")
    ], ephemeral: true})
    let page = 0;
    while (true) {
        await interaction.editReply({embeds: [new generateEmojiEmbed()
            .setEmoji("MEMBER.JOIN")
            .setTitle("Viewing as " + member.displayName)
            .setStatus("Success")
            .setDescription(
                `${channels[page][0].parent ? channels[page][0].parent.name  : "Uncategorised"}` +
                "Visible:\n" +
                channels[page].map(c => {
                    console.log(c)
                    return (channels[page] as Discord.GuildChannel).permissionsFor(member).has("VIEW_CHANNEL") ?
                        `${getEmojiByName("ICONS.CHANNEL." + c.type)} ${c.name}\n` : ""
                }).join("")
            )
        ]})
        break
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command, callback, check };