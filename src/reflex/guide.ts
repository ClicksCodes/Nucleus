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
    const pages = [
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Welcome to Nucleus")
                    .setDescription(
                        "Thanks for adding Nucleus to your server\n\n" +
                            "On the next few pages you can find instructions on getting started, and commands you may want to set up\n\n" +
                            "If you need support, have questions or want features, you can let us know in [Clicks](https://discord.gg/bPaNnxe)"
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
                    .setTitle("Logging")
                    .setDescription(
                        "Nucleus can log server events and keep you informed with what content is being posted to your server.\n" +
                            "We have 2 different types of logs, which each can be configured to send to a channel of your choice:\n" +
                            "**General Logs:** These are events like kicks and channel changes etc.\n" +
                            "**Warning Logs:** Warnings like NSFW avatars and spam etc. that may require action by a server staff member. " +
                            "These go to to a separate staff notifications channel.\n\n" +
                            "A general log channel can be set with `/settings log`\n" +
                            "A warning log channel can be set with `/settings warnings channel`"
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
                            "These commands are all found under `/mod`, and they include:\n" +
                            `**${getEmojiByName(
                                "PUNISH.WARN.YELLOW"
                            )} Warn:** The user is warned (via DM) that they violated server rules.\n` +
                            `**${getEmojiByName(
                                "PUNISH.CLEARHISTORY"
                            )} Clear:** Some messages from a user are deleted in a channel.\n` +
                            `**${getEmojiByName(
                                "PUNISH.MUTE.YELLOW"
                            )} Mute:** The user is unable to send messages or join voice chats.\n` +
                            `**${getEmojiByName(
                                "PUNISH.MUTE.GREEN"
                            )} Unmute:** The user is able to send messages in the server.\n` +
                            `**${getEmojiByName("PUNISH.KICK.RED")} Kick:** The user is removed from the server.\n` +
                            `**${getEmojiByName(
                                "PUNISH.SOFTBAN"
                            )} Softban:** Kicks the user, deleting their messages from every channel.\n` +
                            `**${getEmojiByName(
                                "PUNISH.BAN.RED"
                            )} Ban:** The user is removed from the server, and they are unable to rejoin.\n` +
                            `**${getEmojiByName("PUNISH.BAN.GREEN")} Unban:** The user is able to rejoin the server.`
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
                            "This is done by running `/verify` which sends a message only the user can see, giving them a link to a CAPTCHA to verify.\n" +
                            "After the user complete's the CAPTCHA, they are given a role and can use the permissions accordingly.\n" +
                            "You can set the role given with `/settings verify`"
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
                            "Nucleus can detect, delete, and punish users for sending NSFW content, or links to scam or adult sites.\n" +
                            "You can set the threshold for this in `/settings automation`" // TODO
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
                        "Nucleus has a ticket system that allows users to create tickets and have a support team respond to them.\n" +
                            "Tickets can be created with `/ticket create` and a channel is created, pinging the user and support role.\n" +
                            "When the ticket is resolved, anyone can run `/ticket close` (or click the button) to close it.\n" +
                            "Running `/ticket close` again will delete the ticket."
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
                        "Add a tag system to your server with the `/tag` and `/tags` commands.\n" +
                            "To create a tag, type `/tags create <tag name> <tag content>`.\n" +
                            "Tag names and content can be edited with `/tags edit`.\n" +
                            "To delete a tag, type `/tags delete <tag name>`.\n" +
                            "To view all tags, type `/tags list`.\n"
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
                        "In the near future, we will be releasing extra premium only features.\n" +
                            "These features will include:\n\n" +
                            "**Attachment logs**\n> When a message with attachments is edited or deleted, the logs will also include the images sent.\n" +
                            "\nPremium is not yet available. Check `/nucleus premium` for updates on features and pricing"
                    )
                    .setEmoji("NUCLEUS.COMMANDS.LOCK")
                    .setStatus("Danger")
            )
            .setTitle("Premium")
            .setDescription("Premium features")
            .setPageId(7)
    ];
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
        i.deferUpdate();
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
