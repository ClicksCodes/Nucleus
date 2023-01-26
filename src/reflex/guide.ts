import { getCommandMentionByName } from './../utils/getCommandMentionByName.js';
import { LoadingEmbed } from "../utils/defaults.js";
import Discord, {
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    Guild,
    CommandInteraction,
    GuildTextBasedChannel,
    Message,
    ButtonStyle,
    ChannelType
} from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import createPageIndicator from "../utils/createPageIndicator.js";
import { Embed } from "../utils/defaults.js";

export default async (guild: Guild, interaction?: CommandInteraction) => {
    let c: GuildTextBasedChannel | null = guild.publicUpdatesChannel ? guild.publicUpdatesChannel : guild.systemChannel;
    c = c
    ? c
    : (guild.channels.cache.find(
        (ch) =>
        [
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
            ChannelType.PublicThread,
            ChannelType.PrivateThread,
            ChannelType.AnnouncementThread
        ].includes(ch.type) &&
        ch.permissionsFor(guild.roles.everyone).has("SendMessages") &&
        ch.permissionsFor(guild.members.me!).has("EmbedLinks")
        ) as GuildTextBasedChannel | undefined) ?? null;
    if (interaction) c = interaction.channel as GuildTextBasedChannel;
    if (!c) {
        return;
    }
    let m: Message;
    if (interaction) {
        m = (await interaction.reply({
            embeds: LoadingEmbed,
            fetchReply: true,
            ephemeral: true
        })) as Message;
    } else {
        m = await c.send({ embeds: LoadingEmbed });
    }
    let page = 0;
    const pages = [
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Welcome to Nucleus")
                    .setDescription(
                        "Thanks for adding Nucleus to your server!\n\n" +
                            "The next few pages will show what features Nucleus has to offer, and how to enable them.\n\n" +
                            "If you need support, have questions or want features, you can let us know in [Clicks](https://discord.gg/bPaNnxe)!"
                    )
                    .setEmoji("NUCLEUS.LOGO")
                    .setStatus("Danger")
            )
            .setTitle("Welcome")
            .setDescription("About Nucleus")
            .setPageId(0),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Logs")
                    .setDescription(
                        "Nucleus can log server events and keep you informed with what content is being posted to your server.\n" +
                            "We have 2 different types of logs, which each can be configured to send to a channel of your choice:\n" +
                            "**General:** These are events like kicks and channel changes etc.\n" +
                            `> These are standard logs and can be set with ${await getCommandMentionByName("settings/logs/general")}\n` +
                            "**Warnings:** Warnings like NSFW avatars and spam etc. that may require action by a server staff member.\n" +
                            `> These may require special action by a moderator. You can set the channel with ${await getCommandMentionByName("settings/logs/warnings")}\n` +  // TODO
                            "**Attachments:** All images sent in the server - Used to keep a record of deleted images\n" +
                            `> Sent to a separate log channel to avoid spam. This can be set with ${await getCommandMentionByName("settings/logs/attachments")}\n` +
                            `> ${getEmojiByName("NUCLEUS.PREMIUM")} Please note this feature is only available with ${await getCommandMentionByName("nucleus/premium")}`
                    )
                    .setEmoji("ICONS.LOGGING")
                    .setStatus("Danger")
            )
            .setTitle("Logging")
            .setDescription("Logging, staff warning logs etc.")
            .setPageId(1),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Moderation")
                    .setDescription(
                        "Nucleus has a number of commands that can be used to moderate your server.\n" +
                            `These commands are all found under ${await getCommandMentionByName(("mod"))}, and they include:\n` +
                            `${getEmojiByName("PUNISH.WARN.YELLOW")} ${await getCommandMentionByName("mod/warn")}: The user is warned (via DM) that they violated server rules. More options given if DMs are disabled.\n` +
                            `${getEmojiByName("PUNISH.CLEARHISTORY")} ${await getCommandMentionByName("mod/purge")}: Deletes messages in a channel, giving options to only delete messages by a certain user.\n` +
                            `${getEmojiByName("PUNISH.MUTE.YELLOW")} ${await getCommandMentionByName("mod/mute")}: Stops users sending messages or joining voice chats.\n` +
                            `${getEmojiByName("PUNISH.MUTE.GREEN")} ${await getCommandMentionByName("mod/unmute")}: Allows user to send messages and join voice chats.\n` +
                            `${getEmojiByName("PUNISH.KICK.RED")} ${await getCommandMentionByName("mod/kick")}: Removes a member from the server. They will be able to rejoin.\n` +
                            `${getEmojiByName("PUNISH.SOFTBAN")} ${await getCommandMentionByName("mod/softban")}: Kicks the user, deleting their messages from every channel in a given time frame.\n` +
                            `${getEmojiByName("PUNISH.BAN.RED")} ${await getCommandMentionByName("mod/ban")}: Removes the user from the server, deleting messages from every channel and stops them from rejoining.\n` +
                            `${getEmojiByName("PUNISH.BAN.GREEN")} ${await getCommandMentionByName("mod/unban")}: Allows a member to rejoin the server after being banned.`
                    )
                    .setEmoji("PUNISH.BAN.RED")
                    .setStatus("Danger")
            )
            .setTitle("Moderation")
            .setDescription("Basic moderation commands")
            .setPageId(2),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription(
                        "Nucleus has a verification system that allows users to prove they aren't bots.\n" +
                            `This is done by running ${await getCommandMentionByName("verify")} which sends a message only the user can see, giving them a link to a website to verify.\n` +
                            "After the user complete's the check, they are given a role, which can be set to unlock specific channels.\n" +
                            `You can set the role given with ${await getCommandMentionByName("settings/verify")}`
                    )
                    .setEmoji("CONTROL.REDTICK")
                    .setStatus("Danger")
            )
            .setTitle("Verify")
            .setDescription("Captcha verification system")
            .setPageId(3),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Content Scanning")
                    .setDescription(
                        "Nucleus has a content scanning system that automatically scans links and images sent by users.\n" +
                            "The staff team can be notified when an NSFW image is detected, or malicious links are sent.\n" +
                            `You can check and manage what to moderate in ${await getCommandMentionByName("settings/filters")}`
                    )
                    .setEmoji("MOD.IMAGES.TOOSMALL")
                    .setStatus("Danger")
            )
            .setTitle("Content Scanning")
            .setDescription("Content (NSFW, malware, scams) scanning")
            .setPageId(4),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Tickets")
                    .setDescription(
                        "Nucleus has a ticket system which allows users to create tickets and talk to the server staff or support team.\n" +
                            `Tickets can be created by users with ${await getCommandMentionByName("ticket/create")}, or by clicking a button created by moderators.\n` +
                            `After being created, a new channel or thread is created, and the user and support team are pinged. \n` +
                            `The category or channel to create threads in can be set with ${await getCommandMentionByName("settings/tickets")}\n` +
                            `When the ticket is resolved, anyone can run ${await getCommandMentionByName("ticket/close")} (or click the button) to close it.\n` +
                            `Running ${await getCommandMentionByName("ticket/close")} again will delete the ticket.`
                    )
                    .setEmoji("GUILD.TICKET.CLOSE")
                    .setStatus("Danger")
            )
            .setTitle("Tickets")
            .setDescription("Ticket system")
            .setPageId(5),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Tags")
                    .setDescription(
                        "Nucleus allows you to create tags, which allow a message to be sent when a specific tag is typed.\n" +
                            `Tags can be created with ${await getCommandMentionByName("tags/create")}, and can be edited with ${await getCommandMentionByName("tags/edit")}\n` +
                            `Tags can be deleted with ${await getCommandMentionByName("tags/delete")}, and can be listed with ${await getCommandMentionByName("tags/list")}\n` +
                            `To use a tag, you can type ${await getCommandMentionByName("tag")}, followed by the tag to send`
                    )
                    .setEmoji("PUNISH.NICKNAME.RED")
                    .setStatus("Danger")
            )
            .setTitle("Tags")
            .setDescription("Tag system")
            .setPageId(6),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Premium")
                    .setDescription(
                        "Nucleus Premium allows you to use extra features in your server, which are useful but not essential.\n" +
                        "**No currently free commands will become premium features.**\n" +
                        "Premium features include creating ticket transcripts and attachment logs.\n\n" +
                        "Premium can be purchased in [our server](https://discord.gg/bPaNnxe) in the subscriptions page" // TODO: add a table graphic
                    )
                    .setEmoji("NUCLEUS.PREMIUM")
                    .setStatus("Danger")
            )
            .setTitle("Premium")
            .setDescription("Premium features")
            .setPageId(7)
    ];

    const publicFilter = async (component: MessageComponentInteraction) => {
        return (component.member as Discord.GuildMember).permissions.has("ManageGuild");
    };

    let selectPaneOpen = false;

    let cancelled = false;
    let timedOut = false;
    while (!cancelled && !timedOut) {
        let selectPane: ActionRowBuilder<Discord.StringSelectMenuBuilder | ButtonBuilder>[] = [];

        if (selectPaneOpen) {
            const options: Discord.StringSelectMenuOptionBuilder[] = [];
            pages.forEach((embed) => {
                options.push(new Discord.StringSelectMenuOptionBuilder()
                    .setLabel(embed.title)
                    .setValue(embed.pageId.toString())
                    .setDescription(embed.description || "")
                );
            });
            selectPane = [
                new ActionRowBuilder<Discord.StringSelectMenuBuilder>().addComponents([
                    new Discord.StringSelectMenuBuilder()
                        .addOptions(options)
                        .setCustomId("page")
                        .setMaxValues(1)
                        .setPlaceholder("Choose a page...")
                ])
            ];
        }
        const components: ActionRowBuilder<ButtonBuilder | Discord.StringSelectMenuBuilder>[] = selectPane.concat([
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("left")
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("select")
                    .setEmoji(getEmojiByName("CONTROL.MENU", "id"))
                    .setStyle(selectPaneOpen ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId("right")
                    .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === pages.length - 1)
            )
        ]);
        if (interaction) {
            const em = new Discord.EmbedBuilder(pages[page]!.embed);
            em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page));
            await interaction.editReply({
                embeds: [em],
                components: components
            });
        } else {
            const em = new Discord.EmbedBuilder(pages[page]!.embed);
            em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page));
            (await m.edit({
                embeds: [em],
                components: components
            })) as Message;
        }
        let i;
        try {
            i = await m.awaitMessageComponent({
                filter: interaction
                    ? (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
                    : publicFilter,
                time: 300000
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        await i.deferUpdate();
        if (!("customId" in i.component)) {
            continue;
        } else if (i.component.customId === "left") {
            if (page > 0) page--;
            selectPaneOpen = false;
        } else if (i.component.customId === "right") {
            if (page < pages.length - 1) page++;
            selectPaneOpen = false;
        } else if (i.component.customId === "select") {
            selectPaneOpen = !selectPaneOpen;
        } else if (i.isStringSelectMenu() && i.component.customId === "page") {
            page = parseInt(i.values[0]!);
            selectPaneOpen = false;
        } else {
            cancelled = true;
        }
    }
    if (timedOut) {
        if (interaction) {
            const em = new Discord.EmbedBuilder(pages[page]!.embed);
            em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page)).setFooter({
                text: "Message timed out"
            });
            await interaction.editReply({
                embeds: [em],
                components: []
            });
        } else {
            const em = new Discord.EmbedBuilder(pages[page]!.embed);
            em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page)).setFooter({
                text: "Message timed out"
            });
            await m.edit({
                embeds: [em],
                components: []
            });
        }
    } else {
        if (interaction) {
            const em = new Discord.EmbedBuilder(pages[page]!.embed);
            em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page));
            em.setFooter({ text: "Message closed" });
            interaction.editReply({
                embeds: [em],
                components: []
            });
        } else {
            m.delete();
        }
    }
};
