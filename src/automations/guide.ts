import Discord, { MessageActionRow, MessageButton } from "discord.js";
import generateEmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";

export default async (guild, interaction?) => {
    let c = guild.publicUpdatesChannel ? guild.publicUpdatesChannel : guild.systemChannel;
    c = c ? c : guild.channels.cache.find(ch => ch.type === "GUILD_TEXT" && ch.permissionsFor(guild.roles.everyone).has("SEND_MESSAGES") && ch.permissionsFor(guild.me).has("EMBED_LINKS"));
    let pages = [
        new generateEmojiEmbed()
            .setTitle("Welcome to Nucleus")
            .setDescription(
                "Thanks for adding Nucleus to your server\n\n" +
                "On the next few pages you can find instructions on getting started, and commands you may want to set up\n\n" +
                "If you need support, have questions or want features, you can let us know in [Clicks](https://discord.gg/bPaNnxe)"
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger"),
        new generateEmojiEmbed()
            .setTitle("Logging")
            .setDescription(
                "Nucleus can log server events and keep you informed with what content is being posted to your server.\n" +
                "We have 2 different types of logs, which each can be configured to send to a channel of your choice:\n" +
                "**General Logs:** These are events like kicks and channel changes etc.\n" +
                "**Warning Logs:** Warnings like NSFW avatars and spam etc that may require action by a server staff member.\n\n" +
                "A general log channel can be set with `/settings log channel`\n" +
                "A warning log channel can be set with `/settings warnings channel`"
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger"),
        new generateEmojiEmbed()
            .setTitle("Moderation")
            .setDescription(
                "Nucleus has a number of commands that can be used to moderate your server.\n" +
                "These commands are all found under `/mod`, and they include:\n" +
                `**${getEmojiByName("PUNISH.WARN.YELLOW")} Warn:** The user is warned (via DM) that they violated server rules.\n` +
                `**${getEmojiByName("PUNISH.CLEARHISTORY")} Clear:** Some messages from a user are deleted in a channel.\n` +
                `**${getEmojiByName("PUNISH.MUTE.YELLOW")} Mute:** The user is unable to send messages or join voice chats.\n` +
                `**${getEmojiByName("PUNISH.MUTE.GREEN")} Unmute:** The user is able to send messages in the server.\n` +
                `**${getEmojiByName("PUNISH.KICK.RED")} Kick:** The user is removed from the server.\n` +
                `**${getEmojiByName("PUNISH.SOFTBAN")} Softban:** Kicks the user, deleting their messages from every channel.\n` +
                `**${getEmojiByName("PUNISH.BAN.RED")} Ban:** The user is removed from the server, and they are unable to rejoin.\n` +
                `**${getEmojiByName("PUNISH.BAN.GREEN")} Unban:** The user is able to rejoin the server.\n`
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger"),
        new generateEmojiEmbed()
            .setTitle("Verify")
            .setDescription(
                "Nucleus has a verification system that allows users to prove they aren't bots.\n" +
                "This is done by running `/verify` which sends a message only the user can see, giving them a link to a CAPTCHA to verify.\n" +
                "After the user complete's the CAPTCHA, they are given a role and can use the permissions accordingly.\n" +
                "You can set the role given with `/settings verify role`"
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger"),
        new generateEmojiEmbed()
            .setTitle("Content Scanning")
            .setDescription(
                "Nucleus has a content scanning system that automatically scans links and images sent by users.\n" +
                "Nucleus can detect, delete, and punish users for sending NSFW content, or links to scam or adult sites.\n" +
                "You can set the threshold for this in `/settings automation`"
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger"),
        new generateEmojiEmbed()
            .setTitle("Tickets")
            .setDescription(
                "Nucleus has a ticket system that allows users to create tickets and have a support team respond to them.\n" +
                "Tickets can be created with `/ticket create` and a channel is created, pinging the user and support role.\n" +
                "When the ticket is resolved, anyone can run `/ticket close` to archive it.\n" +
                "Running `/ticket close` again will delete the ticket."
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger")
    ]
    let m;
    if (interaction) {
        m = await interaction.reply({embeds: [
            new generateEmojiEmbed()
                .setTitle("Welcome")
                .setDescription(`One moment...`)
                .setStatus("Danger")
                .setEmoji("NUCLEUS.LOADING")
        ], fetchReply: true, ephemeral: true});
    } else {
        m = await c.send({embeds: [
            new generateEmojiEmbed()
                .setTitle("Welcome")
                .setDescription(`One moment...`)
                .setStatus("Danger")
                .setEmoji("NUCLEUS.LOADING")
        ], fetchReply: true });
    }
    let page = 0;

    let f = async (component) => {
        return (component.member as Discord.GuildMember).permissions.has("MANAGE_GUILD");
    }

    while (true) {
        if (interaction) {
            await interaction.editReply({
                embeds: [pages[page].setFooter({text: `Page ${page + 1}/${pages.length}`})],
                components: [new MessageActionRow().addComponents([
                    new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(page === 0),
                    new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(page === pages.length - 1),
                    new MessageButton().setCustomId("close").setEmoji(getEmojiByName("CONTROL.CROSS", "id")).setStyle("DANGER")
                ])],
                fetchReply: true
            });
        } else {
            await m.edit({
                embeds: [pages[page].setFooter({text: `Page ${page + 1}/${pages.length}`})],
                components: [new MessageActionRow().addComponents([
                    new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(page === 0),
                    new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(page === pages.length - 1),
                    new MessageButton().setCustomId("close").setEmoji(getEmojiByName("CONTROL.CROSS", "id")).setStyle("DANGER")
                ])],
                fetchReply: true
            });
        }
        let i
        try {
            i = await m.awaitMessageComponent({filter: interaction ? () => { return true } : f, componentType: "BUTTON", time: 600000});
        } catch(e) { break }
        i.deferUpdate()
        if (i.component.customId == "left") {
            if (page > 0) page--;
        } else if (i.component.customId == "right") {
            if (page < pages.length - 1) page++;
        } else if (i.component.customId == "close") {
            if (interaction) {
                interaction.delete();
            } else {
                m.delete();
            }
            return;
        } else {
            await m.delete()
            break;
        }
    }
    if (interaction) {
        await interaction.editReply({
            embeds: [pages[page].setFooter({text: `Page ${page + 1}/${pages.length} | Message timed out`})],
            components: [new MessageActionRow().addComponents([
                new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(true),
                new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(true),
                new MessageButton().setCustomId("close").setEmoji(getEmojiByName("CONTROL.CROSS", "id")).setStyle("DANGER").setDisabled(true)
            ])]
        });
    } else {
        await m.edit({
            embeds: [pages[page].setFooter({text: `Page ${page + 1}/${pages.length} | Message timed out`})],
            components: [new MessageActionRow().addComponents([
                new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setStyle("SECONDARY").setDisabled(true),
                new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setStyle("SECONDARY").setDisabled(true),
                new MessageButton().setCustomId("close").setEmoji(getEmojiByName("CONTROL.CROSS", "id")).setStyle("DANGER").setDisabled(true)
            ])]
        });
    }
}
