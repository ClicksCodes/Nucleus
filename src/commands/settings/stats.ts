import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, { CommandInteraction, Message, ActionRowBuilder, GuildMember, StringSelectMenuBuilder, StringSelectMenuInteraction, SelectMenuOptionBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import client from "../../utils/client.js";
import convertCurlyBracketString from "../../utils/convertCurlyBracketString.js";
import { callback as statsChannelAddCallback } from "../../reflex/statsChannelUpdate.js";
import singleNotify from "../../utils/singleNotify.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("stats")
        .setDescription("Controls channels which update when someone joins or leaves the server")

const callback = async (interaction: CommandInteraction) => {
    if (!interaction.guild) return;
    let closed = false;
    let page = 0;
    do {
        const config = await client.database.guilds.read(interaction.guild.id);
        const stats = config.stats;  // stats: Record<string, { name: string; enabled: boolean }>
        if (!stats) {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setTitle("Stats channels")
                .setDescription("You don't have ant stats channels yet")
                .setStatus("Success")
                .setEmoji("")
            ]})
        }
        let pageSelect = new StringSelectMenuBuilder()
            .setCustomId("page")
            .setPlaceholder("Select a stats channel to manage")
            .setMinValues(1)
            .setMaxValues(1);
        for (const [id, { name, enabled }] of Object.entries(stats)) {
            pageSelect.addOption()
        }
        // [ Action... ] -> Edit, delete, reorder
        // [Back][Next][Add]
    } while (!closed);
    closed = true;
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageChannels"))
        return "You must have the *Manage Channels* permission to use this command";
    return true;
};


export { command };
export { callback };
export { check };