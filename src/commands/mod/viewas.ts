import Discord, {
    CommandInteraction,
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    NonThreadGuildBasedChannel
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
    /*
     * {
            categoryObject: channel[],
            categoryObject: channel[],
            "null": channel[]
        }
    */

    const channels: Record<string, GuildBasedChannel[]> = {"": [] as GuildBasedChannel[]};

    interaction.guild!.channels.fetch().then(channelCollection => {
        channelCollection.forEach(channel => {
            if (!channel) return; // if no channel
            if (channel.type === Discord.ChannelType.GuildCategory) {
                if(!channels[channel!.id]) channels[channel!.id] = [channel];
            } else if (channel.parent) {
                if (!channels[channel.parent.id]) channels[channel.parent.id] = [channel];
                else (channels[channel.parent.id as string])!.push(channel);
            } else {
                channels[""]!.push(channel);
            }
        });
    });

    const member = interaction.options.getMember("member") as Discord.GuildMember;
    const autoSortBelow = [Discord.ChannelType.GuildVoice, Discord.ChannelType.GuildStageVoice];
    // for each category, sort its channels. This should be based on the order of the channels, with voice and stage channels sorted below text
    channels = Object.values(channels).map((c) => {
        return c.sort((a: GuildBasedChannel, b: GuildBasedChannel) => {
            if (a.type === Discord.ChannelType.PrivateThread || b.type === Discord.ChannelType.PrivateThread)
            if (autoSortBelow.includes(a.type) && autoSortBelow.includes(b.type)) return a.position ?? 0 - b.position ;
            if (autoSortBelow.includes(a.type)) return 1;
            if (autoSortBelow.includes(b.type)) return -1;
            return a - b;
        });
    }
    

    //OLD CODE START
    // const unprocessedChannels: GuildBasedChannel[] = [];
    // let m;
    // interaction.guild!.channels.cache.forEach((channel) => {
    //     if (!channel.parent && channel.type !== Discord.ChannelType.GuildCategory) unprocessedChannels.push(channel);
    // });
    // let channels: GuildBasedChannel[][] = [unprocessedChannels];
    // channels = channels.concat(
    //     interaction.guild!.channels.cache
    //         .filter((c) => c.type === Discord.ChannelType.GuildCategory)
    //         .map((c) => (c as CategoryChannel).children.map((c) => c))
    // );
    // const autoSortBelow = ["GUILD_VOICE", "GUILD_STAGE_VOICE"];
    // channels = channels.map((c) =>
    //     c.sort((a, b) => {
    //         if (autoSortBelow.includes(a.type) && autoSortBelow.includes(b.type)) return a.position - b.position;
    //         if (autoSortBelow.includes(a.type)) return 1;
    //         if (autoSortBelow.includes(b.type)) return -1;
    //         return a.position - b.position;
    //     })
    // );
    // // Sort all arrays by the position of the first channels parent position
    // channels = channels.sort((a, b) => {
    //     if (!a[0].parent) return -1;
    //     if (!b[0].parent) return 1;
    //     return a[0].parent.position - b[0].parent.position;
    // });
    // const member = interaction.options.getMember("member") as Discord.GuildMember;
    // m = await interaction.reply({
    //     embeds: [
    //         new EmojiEmbed()
    //             .setEmoji("MEMBER.JOIN")
    //             .setTitle("Viewing as " + member.displayName)
    //             .setStatus("Success")
    //     ],
    //     ephemeral: true,
    //     fetchReply: true
    // });
    // let page = 0;
    // let timedOut = false;
    // while (!timedOut) {
    //     m = await interaction.editReply({
    //         embeds: [
    //             new EmojiEmbed()
    //                 .setEmoji("MEMBER.JOIN")
    //                 .setTitle("Viewing as " + member.displayName)
    //                 .setStatus("Success")
    //                 .setDescription(
    //                     `**${channels[page][0].parent ? channels[page][0].parent.name : "Uncategorised"}**` +
    //                         "\n" +
    //                         channels[page]
    //                             .map((c) => {
    //                                 let channelType = c.type;
    //                                 if (interaction.guild.rulesChannelId === c.id) channelType = "RULES";
    //                                 else if ("nsfw" in c && c.nsfw) channelType += "_NSFW";
    //                                 return c.permissionsFor(member).has("VIEW_CHANNEL")
    //                                     ? `${getEmojiByName("ICONS.CHANNEL." + channelType)} ${c.name}\n` +
    //                                           (() => {
    //                                               if ("threads" in c && c.threads.cache.size > 0) {
    //                                                   return (
    //                                                       c.threads.cache
    //                                                           .map(
    //                                                               (t) =>
    //                                                                   ` ${
    //                                                                       getEmojiByName("ICONS.CHANNEL.THREAD_PIPE") +
    //                                                                       " " +
    //                                                                       getEmojiByName("ICONS.CHANNEL.THREAD_CHANNEL")
    //                                                                   } ${t.name}`
    //                                                           )
    //                                                           .join("\n") + "\n"
    //                                                   );
    //                                               }
    //                                               return "";
    //                                           })()
    //                                     : "";
    //                             })
    //                             .join("") +
    //                         "\n" +
    //                         pageIndicator(channels.length, page)
    //                 )
    //         ],
    //         components: [
    //             new ActionRowBuilder().addComponents([
    //                 new SelectMenuBuilder()
    //                     .setOptions(
    //                         channels.map((c, index) => ({
    //                             label: c[0].parent ? c[0].parent.name : "Uncategorised",
    //                             value: index.toString(),
    //                             default: page === index
    //                         }))
    //                     )
    //                     .setCustomId("select")
    //                     .setMaxValues(1)
    //                     .setMinValues(1)
    //                     .setPlaceholder("Select a category")
    //             ]),
    //             new ActionRowBuilder().addComponents([
    //                 new ButtonBuilder()
    //                     .setLabel(
    //                         page === 0
    //                             ? ""
    //                             : channels[page - 1][0].parent
    //                             ? channels[page - 1][0].parent.name
    //                             : "Uncategorised"
    //                     )
    //                     .setDisabled(page === 0)
    //                     .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
    //                     .setStyle(ButtonStyle.Primary)
    //                     .setCustomId("previous"),
    //                 new ButtonBuilder()
    //                     .setLabel(
    //                         page === channels.length - 1
    //                             ? ""
    //                             : channels[page + 1][0].parent
    //                             ? channels[page + 1][0].parent.name
    //                             : "Uncategorised"
    //                     )
    //                     .setDisabled(page === channels.length - 1)
    //                     .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
    //                     .setStyle(ButtonStyle.Primary)
    //                     .setCustomId("next")
    //             ])
    //         ]
    //     });
    //     let i;
    //     try {
    //         i = await m.awaitMessageComponent({ time: 300000 });
    //     } catch (e) {
    //         timedOut = true;
    //         continue;
    //     }
    //     i.deferUpdate();
    //     if (i.customId === "next") {
    //         page++;
    //     } else if (i.customId === "previous") {
    //         page--;
    //     } else if (i.customId === "select") {
    //         page = parseInt(i.values[0]);
    //     }
    // }
    
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has("MANAGE_ROLES")) throw new Error("You do not have the *Manage Roles* permission");
    return true;
};

export { command, callback, check };
