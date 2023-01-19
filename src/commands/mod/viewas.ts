import { LoadingEmbed } from './../../utils/defaults.js';
import Discord, {
    CommandInteraction,
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    NonThreadGuildBasedChannel,
    StringSelectMenuOptionBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import type { GuildBasedChannel } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import pageIndicator from "../../utils/createPageIndicator.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("viewas")
        .setDescription("View the server as a specific member")
        .addUserOption((option) => option.setName("member").setDescription("The member to view as").setRequired(true));

const callback = async (interaction: CommandInteraction): Promise<void> => {

    const m = await interaction.reply({embeds: LoadingEmbed, ephemeral: true, fetchReply: true})

    let channels: Record<string, GuildBasedChannel[]> = {"": []};

    const channelCollection = await interaction.guild!.channels.fetch();

    channelCollection.forEach(channel => {
        if (!channel) return; // if no channel
        if (channel.type === Discord.ChannelType.GuildCategory) {
            if(!channels[channel!.id]) channels[channel!.id] = [];
        } else if (channel.parent) {
            if (!channels[channel.parent.id]) channels[channel.parent.id] = [channel];
            else (channels[channel.parent.id as string])!.push(channel);
        } else {
            channels[""]!.push(channel);
        }
    });

    const member = interaction.options.getMember("member") as Discord.GuildMember;
    const autoSortBelow = [Discord.ChannelType.GuildVoice, Discord.ChannelType.GuildStageVoice];

    for (const category in channels) {
        channels[category] = channels[category]!.sort((a: GuildBasedChannel, b: GuildBasedChannel) => {
            const disallowedTypes = [Discord.ChannelType.PublicThread, Discord.ChannelType.PrivateThread, Discord.ChannelType.AnnouncementThread];
            if (disallowedTypes.includes(a.type) || disallowedTypes.includes(b.type)) return 0;
            a = a as NonThreadGuildBasedChannel;
            b = b as NonThreadGuildBasedChannel;
            if (autoSortBelow.includes(a.type) && autoSortBelow.includes(b.type)) return a.position - b.position;
            if (autoSortBelow.includes(a.type)) return 1;
            if (autoSortBelow.includes(b.type)) return -1;
            return a.position - b.position;
        });
    }
    for (const category in channels) {
        channels[category] = channels[category]!.filter((c) => {
            return c.permissionsFor(member).has("ViewChannel");
        });
    }
    for (const category in channels) {
        channels[category] = channels[category]!.filter((c) => {
            return !(c.type === Discord.ChannelType.PublicThread || c.type === Discord.ChannelType.PrivateThread || c.type === Discord.ChannelType.AnnouncementThread)
        });
    }
    channels = Object.fromEntries(Object.entries(channels).filter(([_, v]) => v.length > 0));
    let page = 0;
    let closed = false;
    const categoryIDs = Object.keys(channels);
    const categoryNames = Object.values(channels).map((c) => {
        return c[0]!.parent?.name ?? "Uncategorised";
    });
    // Split the category names into the first and last 25, ignoring the last 25 if there are 25 or less
    const first25 = categoryNames.slice(0, 25);
    const last25 = categoryNames.slice(25);
    const categoryNames25: string[][] = [first25];
    if (last25.length > 0) categoryNames25.push(last25);

    const channelTypeEmoji: Record<number, string> = {
        0: "GUILD_TEXT",  // Text channel
        2: "GUILD_VOICE",  // Voice channel
        5: "GUILD_NEWS",  // Announcement channel
        13: "GUILD_STAGE_VOICE",  // Stage channel
        15: "FORUM",  // Forum channel
        99: "RULES"  // Rules channel
    };
    const NSFWAvailable: number[] = [0, 2, 5, 13];
    const rulesChannel = interaction.guild!.rulesChannel?.id;

    async function nameFromChannel(channel: GuildBasedChannel): Promise<string> {
        let channelType: Discord.ChannelType | 99 = channel.type;
        if (channelType === Discord.ChannelType.GuildCategory) return "";
        if (channel.id === rulesChannel) channelType = 99
        let threads: Discord.ThreadChannel[] = [];
        if ("threads" in channel) {
            threads = channel.threads.cache.toJSON().map((t) => t as Discord.ThreadChannel);
        }
        const nsfw = ("nsfw" in channel ? channel.nsfw : false) && NSFWAvailable.includes(channelType)
        const emojiName = channelTypeEmoji[channelType.valueOf()] + (nsfw ? "_NSFW" : "");
        const emoji = getEmojiByName("ICONS.CHANNEL." + (threads.length ? "THREAD_CHANNEL" : emojiName));
        let current = `${emoji} ${channel.name}`;
        if (threads.length) {
            for (const thread of threads) {
                current += `\n${getEmojiByName("ICONS.CHANNEL.THREAD_PIPE")} ${thread.name}`;
            }
        }
        return current;
    }

    while (!closed) {
        const category = categoryIDs[page]!;
        let description = "";
        for (const channel of channels[category]!) {
            description += `${await nameFromChannel(channel)}\n`;
        }

        const parsedCategorySelectMenu: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = categoryNames25.map(
            (categories, set) => { return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
                .setCustomId("category")
                .setMinValues(1)
                .setMaxValues(1)
                .setOptions(categories.map((c, i) => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(c)
                        .setValue((set * 25 + i).toString())
                        // @ts-expect-error
                        .setEmoji(getEmojiByName("ICONS.CHANNEL.CATEGORY", "id"))  // Again, this is valid but TS doesn't think so
                        .setDefault((set * 25 + i) === page)
                }))
            )}
        );

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = parsedCategorySelectMenu
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("back")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0)
                .setEmoji(getEmojiByName("CONTROL.LEFT", "id")),
            new ButtonBuilder()
                .setCustomId("right")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === categoryIDs.length - 1)
                .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
        ));

        await interaction.editReply({
            embeds: [new EmojiEmbed()
                .setEmoji("MEMBER.JOIN")
                .setTitle("Viewing as " + member.displayName)
                .setStatus("Success")
                .setDescription(description + "\n" + pageIndicator(categoryIDs.length, page))
            ], components: components
        });
        let i;
        try {
            i = await m.awaitMessageComponent({filter: (i) => i.user.id === interaction.user.id, time: 30000});
        } catch (e) {
            closed = true;
            continue;
        }
        i.deferUpdate();
        if (i.customId === "back") page--;
        else if (i.customId === "right") page++;
        else if (i.customId === "category" && i.isStringSelectMenu()) page = parseInt(i.values[0]!);
    }
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has("ManageRoles")) return "You do not have the *Manage Roles* permission";
    return true;
};

export { command, callback, check };
