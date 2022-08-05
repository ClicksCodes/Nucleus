import { LoadingEmbed } from "./../utils/defaultEmbeds.js";
import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SelectMenuOption, SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import createPageIndicator from "../utils/createPageIndicator.js";
import client from "../utils/client.js";
import confirmationMessage from "../utils/confirmationMessage.js";

const command = new SlashCommandBuilder()
    .setName("privacy")
    .setDescription("Information and options for you and your server's settings");

class Embed {
    embed: Discord.MessageEmbed;
    title: string;
    description = "";
    pageId = 0;
    components?: MessageActionRow[] = [];
    setEmbed(embed: Discord.MessageEmbed) { this.embed = embed; return this; }
    setTitle(title: string) { this.title = title; return this; }
    setDescription(description: string) { this.description = description; return this; }
    setPageId(pageId: number) { this.pageId = pageId; return this; }
    setComponents(components: MessageActionRow[]) { this.components = components; return this; }
}

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const pages = [
        new Embed()
            .setEmbed(new EmojiEmbed()
                .setTitle("Nucleus Privacy")
                .setDescription(
                    "Nucleus is a bot that naturally needs to store data about servers.\n" +
                    "We are entirely [open source](https://github.com/ClicksMinutePer/Nucleus), so you can check exactly what we store, and how it works.\n\n" +
                    "If you are a server administrator, you can view the options page in the dropdown under this message.\n\n" +
                    "Any questions about Nucleus, how it works and data stored can be asked in [our server](https://discord.gg/bPaNnxe)."
                )
                .setEmoji("NUCLEUS.LOGO")
                .setStatus("Danger")
            ).setTitle("Welcome").setDescription("General privacy information").setPageId(0),
        new Embed()
            .setEmbed(new EmojiEmbed()
                .setTitle("Scanners")
                .setDescription(
                    "Nucleus uses [unscan](https://unscan.co) to scan links, images and files for malware and other threats.\n" +
                    "This service's [privacy policy](https://unscan.co/policies) is public, and they \"do not store or sell your data.\""
                )
                .setEmoji("NUCLEUS.LOGO")
                .setStatus("Danger")
            ).setTitle("Scanners").setDescription("About Unscan").setPageId(1),
        new Embed()
            .setEmbed(new EmojiEmbed()
                .setTitle("Link scanning and Transcripts")
                .setDescription(
                    "**Facebook** - Facebook trackers include data such as your date of birth, and guess your age if not entered, your preferences, who you interact with and more.\n" +
                    "**AMP** - AMP is a technology that allows websites to be served by Google. This means Google can store and track data, and are pushing this to as many pages as possible.\n\n" +
                    "Transcripts allow you to store all messages sent in a channel. This could be an issue in some cases, as they are hosted on [Pastebin](https://pastebin.com), so a leaked link could show all messages sent in the channel.\n"
                )
                .setEmoji("NUCLEUS.LOGO")
                .setStatus("Danger")
            ).setTitle("Link scanning and Transcripts").setDescription("Regarding Facebook and AMP filter types, and ticket transcripts").setPageId(2)
    ].concat((interaction.member as Discord.GuildMember).permissions.has("ADMINISTRATOR") ? [new Embed()
        .setEmbed(new EmojiEmbed()
            .setTitle("Options")
            .setDescription(
                "Below are buttons for controlling this servers privacy settings"
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger")
        ).setTitle("Options").setDescription("Options").setPageId(3).setComponents([new MessageActionRow().addComponents([
            new MessageButton().setLabel("Clear all data").setCustomId("clear-all-data").setStyle("DANGER")
        ])])
    ] : []);
    const m = await interaction.reply({embeds: LoadingEmbed, fetchReply: true, ephemeral: true});
    let page = 0;

    let selectPaneOpen = false;
    let nextFooter = null;

    while (true) {
        let selectPane = [];

        if (selectPaneOpen) {
            const options = [];
            pages.forEach(embed => {
                options.push(new SelectMenuOption({
                    label: embed.title,
                    value: embed.pageId.toString(),
                    description: embed.description || ""
                }));
            });
            selectPane = [new MessageActionRow().addComponents([
                new Discord.MessageSelectMenu()
                    .addOptions(options)
                    .setCustomId("page")
                    .setMaxValues(1)
                    .setPlaceholder("Choose a page...")
            ])];
        }
        const components = selectPane.concat([new MessageActionRow().addComponents([
            new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(page === 0),
            new MessageButton().setCustomId("select").setEmoji(getEmojiByName("CONTROL.MENU", "id")).setStyle(selectPaneOpen ? "PRIMARY" : "SECONDARY").setDisabled(false),
            new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(page === pages.length - 1)
        ])]);
        const em = new Discord.MessageEmbed(pages[page].embed);
        em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page));
        em.setFooter({text: nextFooter ?? ""});
        await interaction.editReply({
            embeds: [em],
            components: components.concat(pages[page].components)
        });
        let i;
        try {
            i = await m.awaitMessageComponent({time: 300000});
        } catch(e) { break; }
        nextFooter = null;
        i.deferUpdate();
        if (i.component.customId === "left") {
            if (page > 0) page--;
            selectPaneOpen = false;
        } else if (i.component.customId === "right") {
            if (page < pages.length - 1) page++;
            selectPaneOpen = false;
        } else if (i.component.customId === "select") {
            selectPaneOpen = !selectPaneOpen;
        } else if (i.component.customId === "page") {
            page = parseInt(i.values[0]);
            selectPaneOpen = false;
        } else if (i.component.customId === "clear-all-data") {
            const confirmation = await new confirmationMessage(interaction)
                .setEmoji("CONTROL.BLOCKCROSS")
                .setTitle("Clear All Data")
                .setDescription(
                    "Are you sure you want to delete all data on this server? This includes your settings and all punishment histories.\n\n" +
                    "**This cannot be undone.**"
                )
                .setColor("Danger")
                .send(true);
            if (confirmation.cancelled) { break; }
            if (confirmation.success) {
                client.database.guilds.delete(interaction.guild.id);
                client.database.history.delete(interaction.guild.id);
                nextFooter = "All data cleared";
                continue;
            } else {
                nextFooter = "No changes were made";
                continue;
            }
        } else {
            const em = new Discord.MessageEmbed(pages[page].embed);
            em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page));
            em.setFooter({text: "Message closed"});
            interaction.editReply({embeds: [em], components: []});
            return;
        }
    }
    const em = new Discord.MessageEmbed(pages[page].embed);
    em.setDescription(em.description + "\n\n" + createPageIndicator(pages.length, page));
    em.setFooter({text: "Message timed out"});
    await interaction.editReply({
        embeds: [em],
        components: []
    });
};

const check = (_interaction: CommandInteraction, _defaultCheck: WrappedCheck) => {
    return true;
};

export { command };
export { callback };
export { check };