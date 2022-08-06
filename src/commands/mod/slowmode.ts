import humanizeDuration from "humanize-duration";
import { CommandInteraction, GuildMember, TextChannel } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import keyValueList from "../../utils/generateKeyValueList.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("slowmode")
        .setDescription("Manages slowmode in a channel")
        .addStringOption((option) =>
            option
                .setName("time")
                .setDescription("The delay between messages")
                .setRequired(false)
                .addChoices([
                    ["Off", "0"],
                    ["5 seconds", "5"],
                    ["10 seconds", "10"],
                    ["15 seconds", "15"],
                    ["30 seconds", "30"],
                    ["1 minute", "60"],
                    ["2 minutes", "120"],
                    ["5 minutes", "300"],
                    ["10 minutes", "600"],
                    ["15 minutes", "900"],
                    ["30 minutes", "1800"],
                    ["1 hour", "3600"],
                    ["2 hours", "7200"],
                    ["6 hours", "21600"]
                ])
        );

const callback = async (interaction: CommandInteraction): Promise<void> => {
    let time = parseInt(interaction.options.getString("time") ?? "0");
    if (
        time === 0 &&
        (interaction.channel as TextChannel).rateLimitPerUser === 0
    ) {
        time = 10;
    }
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("CHANNEL.SLOWMODE.OFF")
        .setTitle("Slowmode")
        .setDescription(
            keyValueList({
                time: time
                    ? humanizeDuration(time * 1000, { round: true })
                    : "No delay"
            }) + "Are you sure you want to set the slowmode in this channel?"
        )
        .setColor("Danger")
        .send();
    if (confirmation.cancelled) return;
    if (confirmation.success) {
        try {
            (interaction.channel as TextChannel).setRateLimitPerUser(time);
        } catch (e) {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.SLOWMODE.OFF")
                        .setTitle("Slowmode")
                        .setDescription(
                            "Something went wrong while setting the slowmode"
                        )
                        .setStatus("Danger")
                ],
                components: []
            });
        }
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.SLOWMODE.ON")
                    .setTitle("Slowmode")
                    .setDescription("The channel slowmode was set successfully")
                    .setStatus("Success")
            ],
            components: []
        });
    } else {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.SLOWMODE.ON")
                    .setTitle("Slowmode")
                    .setDescription("No changes were made")
                    .setStatus("Success")
            ],
            components: []
        });
    }
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    // Check if Nucleus can set the slowmode
    if (!interaction.guild.me.permissions.has("MANAGE_CHANNELS"))
        throw "I do not have the *Manage Channels* permission";
    // Check if the user has manage_channel permission
    if (!member.permissions.has("MANAGE_CHANNELS"))
        throw "You do not have the *Manage Channels* permission";
    // Allow slowmode
    return true;
};

export { command, callback, check };
