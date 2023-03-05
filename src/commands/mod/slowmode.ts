// @ts-expect-error
import humanizeDuration from "humanize-duration";
import type { CommandInteraction, GuildMember, TextChannel } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
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
                .addChoices(
                    { name: "Off", value: "0" },
                    { name: "5 seconds", value: "5" },
                    { name: "10 seconds", value: "10" },
                    { name: "15 seconds", value: "15" },
                    { name: "30 seconds", value: "30" },
                    { name: "1 minute", value: "60" },
                    { name: "2 minutes", value: "120" },
                    { name: "5 minutes", value: "300" },
                    { name: "10 minutes", value: "600" },
                    { name: "15 minutes", value: "900" },
                    { name: "30 minutes", value: "1800" },
                    { name: "1 hour", value: "3600" },
                    { name: "2 hours", value: "7200" },
                    { name: "6 hours", value: "21600" }
                )
        );

const callback = async (interaction: CommandInteraction): Promise<void> => {
    let time = parseInt((interaction.options.get("time")?.value as string) || "0");
    if (time === 0 && (interaction.channel as TextChannel).rateLimitPerUser === 0) {
        time = 10;
    }
    const confirmation = await new confirmationMessage(interaction)
        .setEmoji("CHANNEL.SLOWMODE.OFF")
        .setTitle("Slowmode")
        .setDescription(
            keyValueList({
                time: time ? humanizeDuration(time * 1000, { round: true }) : "No delay"
            }) + "Are you sure you want to set the slowmode in this channel?"
        )
        .setColor("Danger")
        .setFailedMessage("No changes were made", "Success", "CHANNEL.SLOWMODE.ON")
        .send();
    if (confirmation.cancelled || !confirmation.success) return;
    try {
        (interaction.channel as TextChannel).setRateLimitPerUser(time);
    } catch (e) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.SLOWMODE.OFF")
                    .setTitle("Slowmode")
                    .setDescription("Something went wrong while setting the slowmode")
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
};

const check = (interaction: CommandInteraction, partial: boolean = false) => {
    const member = interaction.member as GuildMember;
    // Check if the user has manage_channel permission
    if (!member.permissions.has("ManageChannels")) return "You do not have the *Manage Channels* permission";
    if (partial) return true;
    // Check if Nucleus can set the slowmode
    if (!interaction.guild!.members.me!.permissions.has("ManageChannels"))
        return "I do not have the *Manage Channels* permission";
    // Allow slowmode
    return true;
};

export { command, callback, check };
export const metadata = {
    longDescription:
        "Stops members from being able to send messages without waiting a certain amount of time between messages.",
    premiumOnly: true
};
