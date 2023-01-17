import { LoadingEmbed } from "../../../utils/defaults.js";
import Discord, { CommandInteraction, Message, ActionRowBuilder, ButtonBuilder, SelectMenuBuilder, ButtonStyle } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../../utils/generateEmojiEmbed.js";
import client from "../../../utils/client.js";
import { toHexArray, toHexInteger } from "../../../utils/calculate.js";

const logs = {
    channelUpdate: "Channels created, deleted or modified",
    emojiUpdate: "Server emojis modified",
    stickerUpdate: "Server stickers modified",
    guildUpdate: "Server settings updated",
    guildMemberUpdate: "Member updated (i.e. nickname)",
    guildMemberPunish: "Members punished (i.e. muted, banned, kicked)",
    guildRoleUpdate: "Role settings changed",
    guildInviteUpdate: "Server invite created or deleted",
    messageUpdate: "Message edited",
    messageDelete: "Message deleted",
    messageDeleteBulk: "Messages purged",
    messageReactionUpdate: "Message reactions cleared",
    messageMassPing: "Message pings multiple members at once",
    messageAnnounce: "Message published in announcement channel",
    threadUpdate: "Thread created or deleted",
    webhookUpdate: "Webhooks created or deleted",
    guildMemberVerify: "Member runs verify",
    autoModeratorDeleted: "Messages auto deleted by Nucleus",
    nucleusSettingsUpdated: "Nucleus' settings updated by a moderator",
    ticketUpdate: "Tickets created or deleted"
};

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("events").setDescription("Sets what events should be logged");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    });
    let m: Message;
    let timedOut = false;
    do {
        const config = await client.database.guilds.read(interaction.guild.id);
        const converted = toHexArray(config.logging.logs.toLog);
        m = (await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Logging Events")
                    .setDescription(
                        "Below are the events being logged in the server. You can toggle them on and off in the dropdown"
                    )
                    .setStatus("Success")
                    .setEmoji("CHANNEL.TEXT.CREATE")
            ],
            components: [
                new ActionRowBuilder().addComponents([
                    new SelectMenuBuilder()
                        .setPlaceholder("Set events to log")
                        .setMaxValues(Object.keys(logs).length)
                        .setCustomId("logs")
                        .setMinValues(0)
                        .setOptions(
                            Object.keys(logs).map((e, i) => ({
                                label: logs[e],
                                value: i.toString(),
                                default: converted.includes(e)
                            }))
                        )
                ]),
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder().setLabel("Select all").setStyle(ButtonStyle.Primary).setCustomId("all"),
                    new ButtonBuilder().setLabel("Select none").setStyle(ButtonStyle.Danger).setCustomId("none")
                ])
            ]
        })) as Message;
        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        i.deferUpdate();
        if (i.customId === "logs") {
            const selected = i.values;
            const newLogs = toHexInteger(selected.map((e) => Object.keys(logs)[parseInt(e)]));
            await client.database.guilds.write(interaction.guild.id, {
                "logging.logs.toLog": newLogs
            });
        } else if (i.customId === "all") {
            const newLogs = toHexInteger(Object.keys(logs).map((e) => e));
            await client.database.guilds.write(interaction.guild.id, {
                "logging.logs.toLog": newLogs
            });
        } else if (i.customId === "none") {
            await client.database.guilds.write(interaction.guild.id, {
                "logging.logs.toLog": 0
            });
        }
    } while (!timedOut);

    await interaction.editReply({ embeds: [m.embeds[0]!.setFooter({ text: "Message timed out" })] });
    return;
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
