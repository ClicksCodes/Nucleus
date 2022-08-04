import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import generateKeyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("avatar")
        .setDescription("Shows the avatar of a user")
        .addUserOption(option => option.setName("user").setDescription("The user to get the avatar of | Default: Yourself"));

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const { renderUser } = client.logger;
    const member = (interaction.options.getMember("user") || interaction.member) as Discord.GuildMember;
    await interaction.reply({embeds: [new EmojiEmbed()
        .setTitle("User Info")
        .setStatus("Success")
        .setEmoji("MEMBER.JOIN")
        .setDescription(
            generateKeyValueList({
                "member": renderUser(member.user),
                "url": member.user.displayAvatarURL({dynamic: true})
            })
        )
        .setImage(await member.user.displayAvatarURL({dynamic: true}))
    ], ephemeral: true, fetchReply: true});
};

const check = (_interaction: CommandInteraction, _defaultCheck: WrappedCheck) => {
    return true;
};

export { command };
export { callback };
export { check };