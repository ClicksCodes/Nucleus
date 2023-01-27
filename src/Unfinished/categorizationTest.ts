import { LoadingEmbed } from "../utils/defaults.js";
import { CommandInteraction, GuildChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder, APIMessageComponentEmoji } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import client from "../utils/client.js";
import addPlural from "../utils/plurals.js";
import getEmojiByName from "../utils/getEmojiByName.js";

const command = new SlashCommandBuilder().setName("categorize").setDescription("Categorizes your servers channels");

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const channels = interaction.guild!.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory);
    const categorized = {};
    await interaction.reply({ embeds: LoadingEmbed, ephemeral: true });
    const predicted = {};
    const types = {
        important: ["rule", "announcement", "alert", "info"],
        general: ["general", "main", "topic", "discuss"],
        commands: ["bot", "command", "music"],
        images: ["pic", "selfies", "image", "gallery", "meme", "media"],
        nsfw: ["porn", "nsfw", "sex", "lewd", "fetish"],
        links: ["link"],
        advertising: ["ads", "advert", "partner", "bump"],
        staff: ["staff", "mod", "admin", "helper", "train"],
        spam: ["spam", "count"],
        logs: ["log"],
        other: ["random", "starboard"],
    };
    for (const c of channels.values()) {
        for (const type in types) {
            for (const word of types[type]) {
                if (c.name.toLowerCase().includes(word)) {
                    predicted[c.id] = predicted[c.id] ?? [];
                    predicted[c.id].push(type);
                }
            }
        }
    }
    let m;
    for (const c of channels) {
        // convert channel to a channel if its a string
        let channel: string | GuildChannel;
        if (typeof c === "string") channel = interaction.guild!.channels.cache.get(c as string)!.id;
        else channel = (c[0] as unknown as GuildChannel).id;
        console.log(channel);
        if (!predicted[channel]) predicted[channel] = [];
        m = await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Categorize")
                    .setDescription(
                        `Select all types that apply to <#${channel}>.\n\n` +
                            `${addPlural(predicted[channel].length, "Suggestion")}: ${predicted[channel].join(", ")}`
                    )
                    .setEmoji("CHANNEL.CATEGORY.CREATE")
                    .setStatus("Success")
            ],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId("selected")
                        .setMaxValues(Object.keys(types).length)
                        .setMinValues(1)
                        .setPlaceholder("Select all types that apply to this channel")
                        .setOptions(
                            Object.keys(types).map((type) => ({
                                label: type,
                                value: type
                            }))
                        )
                ]),
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel("Accept Suggestion")
                        .setCustomId("accept")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(predicted[channel].length === 0)
                        .setEmoji(client.emojis.cache.get(getEmojiByName("ICONS.TICK", "id")) as APIMessageComponentEmoji),
                    new ButtonBuilder()
                        .setLabel('Use "Other"')
                        .setCustomId("reject")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.emojis.cache.get(getEmojiByName("ICONS.CROSS", "id")) as APIMessageComponentEmoji)
                ])
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.message.id === m.id}
            });
        } catch (e) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Categorize")
                        .setEmoji("CHANNEL.CATEGORY.DELETE")
                        .setStatus("Danger")
                        .setDescription(
                            `Select all types that apply to <#${channel}>.\n\n` +
                                `${addPlural(predicted[channel].length, "Suggestion")}: ${predicted[channel].join(
                                    ", "
                                )}`
                        )
                        .setFooter({ text: "Message timed out" })
                ]
            });
        }
        await i.deferUpdate();
        let selected;
        if (i.customId === "select") {
            selected = i.values;
        }
        if (i.customId === "accept") {
            selected = predicted[channel];
        }
        if (i.customId === "reject") {
            selected = ["other"];
        }
        categorized[channel] = selected;
    }
    console.log(categorized);
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
