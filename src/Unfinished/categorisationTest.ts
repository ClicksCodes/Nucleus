import { LoadingEmbed } from "../utils/defaults.js";
import { CommandInteraction, GuildChannel, ActionRowBuilder, ButtonBuilder, SelectMenuBuilder, ButtonStyle } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import client from "../utils/client.js";
import addPlural from "../utils/plurals.js";
import getEmojiByName from "../utils/getEmojiByName.js";

const command = new SlashCommandBuilder().setName("categorise").setDescription("Categorises your servers channels");

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const channels = interaction.guild.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY");
    const categorised = {};
    await interaction.reply({ embeds: LoadingEmbed, ephemeral: true });
    const predicted = {};
    const types = {
        general: ["general", "muted", "main", "topic", "discuss"],
        commands: ["bot", "command", "music"],
        images: ["pic", "selfies", "image"],
        nsfw: ["porn", "nsfw", "sex"],
        links: ["links"],
        advertising: ["ads", "advert", "server", "partner"],
        staff: ["staff", "mod", "admin"],
        spam: ["spam"],
        other: ["random"]
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
        if (typeof c === "string") channel = interaction.guild.channels.cache.get(channel as string).id;
        else channel = (c[0] as unknown as GuildChannel).id;
        console.log(channel);
        if (!predicted[channel]) predicted[channel] = [];
        m = await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Categorise")
                    .setDescription(
                        `Select all types that apply to <#${channel}>.\n\n` +
                            `${addPlural(predicted[channel].length, "Suggestion")}: ${predicted[channel].join(", ")}`
                    )
                    .setEmoji("CHANNEL.CATEGORY.CREATE")
                    .setStatus("Success")
            ],
            components: [
                new ActionRowBuilder().addComponents([
                    new SelectMenuBuilder()
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
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setLabel("Accept Suggestion")
                        .setCustomId("accept")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(predicted[channel].length === 0)
                        .setEmoji(client.emojis.cache.get(getEmojiByName("ICONS.TICK", "id"))),
                    new ButtonBuilder()
                        .setLabel('Use "Other"')
                        .setCustomId("reject")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.emojis.cache.get(getEmojiByName("ICONS.CROSS", "id")))
                ])
            ]
        });
        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
            });
        } catch (e) {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Categorise")
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
        i.deferUpdate();
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
        categorised[channel] = selected;
    }
    console.log(categorised);
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
