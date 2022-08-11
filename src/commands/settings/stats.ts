import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import Discord, { CommandInteraction, Message, MessageActionRow, MessageSelectMenu } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import client from "../../utils/client.js";
import convertCurlyBracketString from "../../utils/convertCurlyBracketString.js";
import { callback as statsChannelAddCallback } from "../../reflex/statsChannelUpdate.js";
import singleNotify from "../../utils/singleNotify.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("stats")
        .setDescription("Controls channels which update when someone joins or leaves the server")
        .addChannelOption((option) => option.setName("channel").setDescription("The channel to modify"))
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("The new channel name | Enter any text or use the extra variables like {memberCount}")
                .setAutocomplete(true)
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    singleNotify("statsChannelDeleted", interaction.guild.id, true);
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Message;
    let config = await client.database.guilds.read(interaction.guild.id);
    if (interaction.options.getString("name")) {
        let channel;
        if (Object.keys(config.getKey("stats")).length >= 25) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.TEXT.DELETE")
                        .setTitle("Stats Channel")
                        .setDescription("You can only have 25 stats channels in a server")
                        .setStatus("Danger")
                ]
            });
        }
        try {
            channel = interaction.options.getChannel("channel");
        } catch {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.TEXT.DELETE")
                        .setTitle("Stats Channel")
                        .setDescription("The channel you provided is not a valid channel")
                        .setStatus("Danger")
                ]
            });
        }
        channel = channel as Discord.TextChannel;
        if (channel.guild.id !== interaction.guild.id) {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Stats Channel")
                        .setDescription("You must choose a channel in this server")
                        .setStatus("Danger")
                        .setEmoji("CHANNEL.TEXT.DELETE")
                ]
            });
        }
        let newName = await convertCurlyBracketString(
            interaction.options.getString("name"),
            null,
            null,
            interaction.guild.name,
            interaction.guild.members
        );
        if (interaction.options.getChannel("channel").type === "GUILD_TEXT") {
            newName = newName.toLowerCase().replace(/[\s]/g, "-");
        }
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.TEXT.EDIT")
            .setTitle("Stats Channel")
            .setDescription(
                `Are you sure you want to set <#${channel.id}> to a stats channel?\n\n*Preview: ${newName.replace(
                    /^ +| $/g,
                    ""
                )}*`
            )
            .setColor("Warning")
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            try {
                const name = interaction.options.getString("name");
                const channel = interaction.options.getChannel("channel");
                await client.database.guilds.write(interaction.guild.id, {
                    [`stats.${channel.id}`]: { name: name, enabled: true }
                });
                const { log, NucleusColors, entry, renderUser, renderChannel } = client.logger;
                const data = {
                    meta: {
                        type: "statsChannelUpdate",
                        displayName: "Stats Channel Updated",
                        calculateType: "nucleusSettingsUpdated",
                        color: NucleusColors.yellow,
                        emoji: "CHANNEL.TEXT.EDIT",
                        timestamp: new Date().getTime()
                    },
                    list: {
                        memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                        changedBy: entry(interaction.user.id, renderUser(interaction.user)),
                        channel: entry(channel.id, renderChannel(channel)),
                        name: entry(
                            interaction.options.getString("name"),
                            `\`${interaction.options.getString("name")}\``
                        )
                    },
                    hidden: {
                        guild: interaction.guild.id
                    }
                };
                log(data);
            } catch (e) {
                console.log(e);
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Stats Channel")
                            .setDescription("Something went wrong and the stats channel could not be set")
                            .setStatus("Danger")
                            .setEmoji("CHANNEL.TEXT.DELETE")
                    ],
                    components: []
                });
            }
        } else {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Stats Channel")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                        .setEmoji("CHANNEL.TEXT.CREATE")
                ],
                components: []
            });
        }
        await statsChannelAddCallback(client, interaction.member);
    }
    while (true) {
        config = await client.database.guilds.read(interaction.guild.id);
        const stats = config.getKey("stats");
        const selectMenu = new MessageSelectMenu()
            .setCustomId("remove")
            .setMinValues(1)
            .setMaxValues(Math.max(1, Object.keys(stats).length));
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Stats Channel")
                    .setDescription(
                        "The following channels update when someone joins or leaves the server. You can select a channel to remove it from the list."
                    )
                    .setStatus("Success")
                    .setEmoji("CHANNEL.TEXT.CREATE")
            ],
            components: [
                new MessageActionRow().addComponents(
                    Object.keys(stats).length
                        ? [
                              selectMenu
                                  .setPlaceholder("Select a stats channel to remove, stopping it updating")
                                  .addOptions(
                                      Object.keys(stats).map((key) => ({
                                          label: interaction.guild.channels.cache.get(key).name,
                                          value: key,
                                          description: `${stats[key].name}`
                                      }))
                                  )
                          ]
                        : [
                              selectMenu
                                  .setPlaceholder("The server has no stats channels")
                                  .setDisabled(true)
                                  .setOptions([
                                      {
                                          label: "*Placeholder*",
                                          value: "placeholder",
                                          description: "No stats channels"
                                      }
                                  ])
                          ]
                )
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            break;
        }
        i.deferUpdate();
        if (i.customId === "remove") {
            const toRemove = i.values;
            await client.database.guilds.write(
                interaction.guild.id,
                null,
                toRemove.map((k) => `stats.${k}`)
            );
        }
    }
    await interaction.editReply({
        embeds: [m.embeds[0]!.setFooter({ text: "Message closed" })],
        components: []
    });
};

const check = (interaction: CommandInteraction, _defaultCheck: WrappedCheck) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("MANAGE_CHANNELS"))
        throw new Error("You must have the *Manage Channels* permission to use this command");
    return true;
};

export { command };
export { callback };
export { check };
