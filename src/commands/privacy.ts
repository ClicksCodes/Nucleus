import { LoadingEmbed } from "../utils/defaults.js";
import Discord, { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuOptionBuilder, SelectMenuOptionBuilder, StringSelectMenuBuilder } from "discord.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import createPageIndicator from "../utils/createPageIndicator.js";
import client from "../utils/client.js";
import confirmationMessage from "../utils/confirmationMessage.js";
import { Embed } from "../utils/defaults.js";

const command = new SlashCommandBuilder()
    .setName("privacy")
    .setDescription("Information and options for you and your server's settings");


const callback = async (interaction: CommandInteraction): Promise<void> => {
    const pages = [
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Nucleus Privacy")
                    .setDescription(
                        "Nucleus is a bot that naturally needs to store data about servers.\n" +
                            "We are entirely [open source](https://github.com/ClicksMinutePer/Nucleus), so you can check exactly what we store, and how it works.\n\n" +
                            "Any questions about Nucleus, how it works, and what data is stored can be asked in [our server](https://discord.gg/bPaNnxe)."
                    )
                    .setEmoji("NUCLEUS.LOGO")
                    .setStatus("Danger")
            )
            .setTitle("Welcome")
            .setDescription("General privacy information")
            .setPageId(0),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Scanners")
                    .setDescription(
                        "Nucleus uses [unscan](https://rapidapi.com/abcdan/api/unscan/) to scan links, images and files for malware and other threats.\n" +
                            'This service\'s [privacy policy](https://unscan.co/policies) is public, and they "do not store or sell your data."'
                    )
                    .setEmoji("NUCLEUS.LOGO")
                    .setStatus("Danger")
            )
            .setTitle("Scanners")
            .setDescription("About Unscan")
            .setPageId(1),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("Link scanning and Transcripts")
                    .setDescription(
                        "**Facebook** - Facebook trackers include data such as your date of birth, and guess your age if not entered, your preferences, who you interact with and more.\n" +
                            "**AMP** - AMP is a technology that allows websites to be served by Google. This means Google can store and track data, and are pushing this to as many pages as possible.\n\n" +
                            "Transcripts allow you to store all messages sent in a channel. This is stored in our database along with the rest of the servers settings but is accessible by anyone with the link, so a leaked link could show all messages sent in the channel.\n"
                    )
                    .setEmoji("NUCLEUS.LOGO")
                    .setStatus("Danger")
            )
            .setTitle("Link scanning and Transcripts")
            .setDescription("Regarding Facebook and AMP filter types, and ticket transcripts")
            .setPageId(2)
    ].concat(
        (interaction.member as Discord.GuildMember).permissions.has("Administrator")
            ? [
                new Embed()
                    .setEmbed(
                        new EmojiEmbed()
                            .setTitle("Options")
                            .setDescription("Below are buttons for controlling this servers privacy settings")
                            .setEmoji("NUCLEUS.LOGO")
                            .setStatus("Danger")
                    )
                    .setTitle("Options")
                    .setDescription("Options")
                    .setPageId(3)
                    .setComponents([
                        new ActionRowBuilder<ButtonBuilder>().addComponents([
                            new ButtonBuilder()
                                .setLabel("Clear all data")
                                .setCustomId("clear-all-data")
                                .setStyle(ButtonStyle.Danger)
                        ])
                    ])
            ]
            : []
    );
    const m = await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    });
    let page = parseInt(client.preloadPage[interaction.channel!.id] ? client.preloadPage[interaction.channel!.id]?.argument! : "0");

    let selectPaneOpen = false;
    let nextFooter = null;

    let timedOut = false;
    while (!timedOut) {
        let selectPane: Discord.ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

        if (selectPaneOpen) {
            const options: SelectMenuOptionBuilder[] = [];
            pages.forEach((embed) => {
                options.push(
                    new StringSelectMenuOptionBuilder({
                        label: embed.title,
                        value: embed.pageId.toString(),
                        description: embed.description || ""
                    })
                );
            });
            selectPane = [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
                    new Discord.StringSelectMenuBuilder()
                        .addOptions(options)
                        .setCustomId("page")
                        .setMaxValues(1)
                        .setPlaceholder("Choose a page...")
                ])
            ];
        }
        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = selectPane.concat([
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
        const em = new Discord.EmbedBuilder(pages[page]!.embed);
        em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page));
        if (nextFooter) em.setFooter({ text: nextFooter });
        await interaction.editReply({
            embeds: [em],
            components: components.concat(pages[page]?.componentsToSet ?? [])
        });
        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id && i.message.id === m.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        nextFooter = null;
        await i.deferUpdate();
        if (i.customId === "left") {
            if (page > 0) page--;
            selectPaneOpen = false;
        } else if (i.customId === "right") {
            if (page < pages.length - 1) page++;
            selectPaneOpen = false;
        } else if (i.customId === "select") {
            selectPaneOpen = !selectPaneOpen;
        } else if (i.customId === "page" && i.isStringSelectMenu()) {
            page = parseInt(i.values[0]!);
            selectPaneOpen = false;
        } else if (i.customId === "clear-all-data") {
            const confirmation = await new confirmationMessage(interaction)
                .setEmoji("CONTROL.BLOCKCROSS")
                .setTitle("Clear All Data")
                .setDescription(
                    "Are you sure you want to delete all data on this server? This includes your settings and all punishment histories.\n\n" +
                        "**This cannot be undone.**"
                )
                .setColor("Danger")
                .send(true);
            if (confirmation.cancelled) {
                continue;
            }
            if (confirmation.success) {
                client.database.guilds.delete(interaction.guild!.id);
                client.database.history.delete(interaction.guild!.id);
                client.database.notes.delete(interaction.guild!.id);
                nextFooter = "All data cleared";
                continue;
            } else {
                nextFooter = "No changes were made";
                continue;
            }
        } else {
            const em = new Discord.EmbedBuilder(pages[page]!.embed);
            em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page));
            em.setFooter({ text: "Message closed" });
            interaction.editReply({ embeds: [em], components: [] });
            return;
        }
    }
    const em = new Discord.EmbedBuilder(pages[page]!.embed);
    em.setDescription(em.data.description + "\n\n" + createPageIndicator(pages.length, page));
    em.setFooter({ text: "Message timed out" });
    await interaction.editReply({
        embeds: [em],
        components: []
    });
};


export { command };
export { callback };
