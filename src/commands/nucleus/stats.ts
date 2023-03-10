import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChannelType,
    CommandInteraction,
    ComponentType,
    Guild,
    ModalBuilder,
    ModalSubmitInteraction,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import config from "../../config/main.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("stats").setDescription("Gets the bot's stats");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const description = `**Servers:** ${client.guilds.cache.size}\n` + `**Ping:** \`${client.ws.ping * 2}ms\``;
    const m = await interaction.reply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Stats")
                .setDescription(description)
                .setStatus("Success")
                .setEmoji("SETTINGS.STATS.GREEN")
        ],
        ephemeral: true,
        fetchReply: true
    });
    if (config.owners.includes(interaction.user.id)) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Admin")
                    .setDescription(description)
                    .setStatus("Success")
                    .setEmoji("SETTINGS.STATS.GREEN")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("admin").setLabel("Admin Panel").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("mod:nickname:599498449733550102")
                        .setLabel("Testing")
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });

        const modal = new ModalBuilder()
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setStyle(TextInputStyle.Short)
                        .setLabel("Guild ID")
                        .setCustomId("guildID")
                        .setPlaceholder("Guild ID")
                        .setMinLength(16)
                        .setMaxLength(25)
                )
            )
            .setTitle("Admin Panel")
            .setCustomId("adminPanel");
        let i1: ButtonInteraction;
        const channel = await client.channels.fetch(interaction.channelId);
        if (
            !channel ||
            [ChannelType.GuildCategory, ChannelType.GroupDM, ChannelType.GuildStageVoice].includes(channel.type)
        )
            return;
        // console.log(interaction)
        if (!("awaitMessageComponent" in channel)) return;
        try {
            i1 = await channel!.awaitMessageComponent<ComponentType.Button>({
                filter: (i) => i.customId === "admin" && i.user.id === interaction.user.id && i.message.id === m.id,
                time: 300000
            });
        } catch (e) {
            console.log(e);
            return;
        }
        await i1.showModal(modal);
        let out: ModalSubmitInteraction;
        try {
            out = await i1.awaitModalSubmit({
                filter: (i) => i.customId === "adminPanel" && i.user.id === interaction.user.id,
                time: 300000
            });
        } catch {
            return;
        }
        await out.deferUpdate();
        const GuildID = out.fields.getTextInputValue("guildID");
        if (!client.guilds.cache.has(GuildID)) {
            await interaction.editReply({
                embeds: [new EmojiEmbed().setTitle("Admin").setDescription("Not in server").setStatus("Danger")],
                components: []
            });
        }

        await interaction.editReply({
            embeds: [],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("stats").setLabel("Stats").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("leave").setLabel("Leave").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("data").setLabel("Guild data").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("purge").setLabel("Delete data").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("cache").setLabel("Reset cache").setStyle(ButtonStyle.Success)
                )
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent<ComponentType.Button>({
                filter: (i) => i.user.id === interaction.user.id && i.message.id === m.id,
                time: 300000
            });
        } catch {
            return;
        }
        await i.deferUpdate();
        const guild = (await client.guilds.fetch(GuildID)) as Guild | null;
        if (!guild) {
            await interaction.editReply({
                embeds: [new EmojiEmbed().setTitle("Admin").setDescription("Not in server").setStatus("Danger")],
                components: []
            });
            return;
        }
        if (i.customId === "stats") {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Stats")
                        .setDescription(
                            `**Name:** ${guild.name}\n` +
                                `**ID:** \`${guild.id}\`\n` +
                                `**Owner:** ${client.users.cache.get(guild.ownerId)!.tag}\n` +
                                `**Member Count:** ${guild.memberCount}\n` +
                                `**Created:** <t:${guild.createdTimestamp}:F>\n` +
                                `**Added Nucleus:** <t:${guild.members.me!.joinedTimestamp}:R>\n` +
                                `**Nucleus' Perms:** https://discordapi.com/permissions.html#${guild.members.me!.permissions.valueOf()}\n`
                        )
                        .setStatus("Success")
                        .setEmoji("SETTINGS.STATS.GREEN")
                ]
            });
        } else if (i.customId === "leave") {
            await guild.leave();
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Left")
                        .setDescription(`Left ${guild.name}`)
                        .setStatus("Success")
                        .setEmoji("SETTINGS.STATS.GREEN")
                ],
                components: []
            });
        } else if (i.customId === "data") {
            // Get all the data and convert to a string
            const data = await client.database.guilds.read(guild.id);
            const stringified = JSON.stringify(data, null, 2);
            const buffer = Buffer.from(stringified);
            const attachment = new AttachmentBuilder(buffer).setName("data.json");
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed().setTitle("Data").setDescription(`Data for ${guild.name}`).setStatus("Success")
                ],
                components: [],
                files: [attachment]
            });
        } else if (i.customId === "purge") {
            await client.database.guilds.delete(GuildID);
            await client.database.history.delete(GuildID);
            await client.database.notes.delete(GuildID);
            await client.database.transcripts.deleteAll(GuildID);
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Purge")
                        .setDescription(`Deleted data for ${guild.name}`)
                        .setStatus("Success")
                        .setEmoji("SETTINGS.STATS.GREEN")
                ],
                components: []
            });
        } else if (i.customId === "cache") {
            await client.memory.forceUpdate(guild.id);
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Cache")
                        .setDescription(`Reset cache for ${guild.name}`)
                        .setStatus("Success")
                        .setEmoji("SETTINGS.STATS.GREEN")
                ],
                components: []
            });
        }
    }
};

export { command };
export { callback };
