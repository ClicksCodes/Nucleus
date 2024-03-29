import type { CommandInteraction } from "discord.js";
import type Discord from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import generateKeyValueList from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("avatar")
        .setDescription("Shows the avatar of a user")
        .addUserOption((option) =>
            option.setName("user").setDescription("The user to get the avatar of | Default: Yourself")
        );

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const { renderUser } = client.logger;
    const member = (interaction.options.getMember("user") ?? interaction.member) as Discord.GuildMember;
    await interaction.reply({
        embeds: [
            new EmojiEmbed()
                .setTitle("User Info")
                .setStatus("Success")
                .setEmoji("MEMBER.JOIN")
                .setDescription(
                    generateKeyValueList({
                        member: renderUser(member.user),
                        url: member.user.displayAvatarURL({ forceStatic: false })
                    })
                )
                .setImage(member.user.displayAvatarURL({ forceStatic: true }))
        ],
        ephemeral: true,
        fetchReply: true
    });
};

export { command };
export { callback };
