import Discord, { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import { testLink, testMalware, testNSFW } from "../reflex/scanners.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";

const command = new SlashCommandBuilder()
    .setName("privacy")
    .setDescription("Information and options for you and your server's settings")

const callback = async (interaction: CommandInteraction): Promise<any> => {
    let components = [];
    if (interaction.inCachedGuild() && interaction.member.permissions.has("MANAGE_GUILD")) {
        components.push(new MessageActionRow().addComponents([new MessageButton()
            .setLabel("Clear all data")
            .setEmoji("CONTROL.CROSS")
            .setCustomId("clear")
            .setStyle("DANGER")
        ]));
    }
    await interaction.reply({embeds: [new EmojiEmbed()
        .setTitle("Privacy")
        .setDescription(
            "**Link Scanning Types**\n" +
            "> Facebook - Facebook trackers include data such as your date of birth, and guess your age if not entered, your preferences, who you interact with and more.\n" +
            "> AMP - AMP is a technology that allows websites to be served by Google. This means Google can store and track data, and are pushing this to as many pages as possible.\n\n" +
            "**Transcripts**\n" +
            "> Transcripts allow you to store all messages sent in a channel. This could be an issue in some cases, as they are hosted on [Pastebin](https://pastebin.com), so a leaked link could show all messages sent in the channel.\n"
        )
        .setStatus("Success")
        .setEmoji("NUCLEUS.COMMANDS.LOCK")
    ], components: components});
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };