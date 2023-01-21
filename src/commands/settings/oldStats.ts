import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, { CommandInteraction, Message, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuOptionBuilder, APIMessageComponentEmoji, MessageComponentInteraction, TextInputBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import client from "../../utils/client.js";
import convertCurlyBracketString from "../../utils/convertCurlyBracketString.js";
import singleNotify from "../../utils/singleNotify.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import createPageIndicator from "../../utils/createPageIndicator.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import type { GuildConfig } from "../../utils/database.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("stats")
        .setDescription("Controls channels which update when someone joins or leaves the server")

type ChangesType = Record<string, { name?: string; enabled?: boolean; }>

const applyChanges = (baseObject: GuildConfig['stats'], changes: ChangesType): GuildConfig['stats'] => {
    for (const [id, { name, enabled }] of Object.entries(changes)) {
        if (!baseObject[id]) baseObject[id] = { name: "", enabled: false};
        if (name) baseObject[id]!.name = name;
        if (enabled) baseObject[id]!.enabled = enabled;
    }
    return baseObject;
}


const callback = async (interaction: CommandInteraction) => {
    try{
    if (!interaction.guild) return;
    const { renderChannel } = client.logger;
    let closed = false;
    let page = 0;
    const m: Message = await interaction.reply({ embeds: LoadingEmbed, ephemeral: true, fetchReply: true });
    let changes: ChangesType = {};
    do {
        const config = await client.database.guilds.read(interaction.guild.id);
        const stats = config.stats;
        let currentID = "";
        let current: {
            name: string;
            enabled: boolean;
        } = {
            name: "",
            enabled: false
        };
        let description = "";
        let pageSelect = new StringSelectMenuBuilder()
            .setCustomId("page")
            .setPlaceholder("Select a stats channel to manage")
            .setDisabled(Object.keys(stats).length === 0)
            .setMinValues(1)
            .setMaxValues(1);
        let actionSelect = new StringSelectMenuBuilder()
            .setCustomId("action")
            .setPlaceholder("Perform an action")
            .setMinValues(1)
            .setMaxValues(1)
            .setDisabled(Object.keys(stats).length === 0)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel("Edit")
                    .setValue("edit")
                    .setDescription("Edit the name of this stats channel")
                    .setEmoji(getEmojiByName("ICONS.EDIT", "id") as APIMessageComponentEmoji),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Delete")
                    .setValue("delete")
                    .setDescription("Delete this stats channel")
                    .setEmoji(getEmojiByName("TICKETS.ISSUE", "id") as APIMessageComponentEmoji)
            );
        if (Object.keys(stats).length === 0) {
            description = "You do not have any stats channels set up yet"
            pageSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel("No stats channels").setValue("none"))
        } else {
            currentID = Object.keys(stats)[page]!
            current = stats[currentID]!;
            current = applyChanges({ [currentID]: current }, changes)[currentID]!;
            for (const [id, { name, enabled }] of Object.entries(stats)) {
                pageSelect.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(name)
                        .setValue(id)
                        .setDescription(`Enabled: ${enabled}`)
                );
            }
            actionSelect.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(current.enabled ? "Disable" : "Enable")
                .setValue("toggleEnabled")
                .setDescription(`Currently ${current.enabled ? "Enabled" : "Disabled"}, click to ${current.enabled ? "disable" : "enable"} this channel`)
                .setEmoji(getEmojiByName(current.enabled ? "CONTROL.TICK" : "CONTROL.CROSS", "id") as APIMessageComponentEmoji)
            );
            description = `**Currently Editing:** ${renderChannel(currentID)}\n\n` +
                `${getEmojiByName(current.enabled ? "CONTROL.TICK" : "CONTROL.CROSS")} Currently ${current.enabled ? "Enabled" : "Disabled"}\n` +
                `**Name:** \`${current.name}\`\n` +
                `**Preview:** ${await convertCurlyBracketString(current.name, interaction.user.id, interaction.user.username, interaction.guild.name, interaction.guild.members)}`
        }
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("back")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id") as APIMessageComponentEmoji)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setEmoji(getEmojiByName("CONTROL.RIGHT", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === Object.keys(stats).length - 1),
                new ButtonBuilder()
                    .setCustomId("add")
                    .setLabel("Create new")
                    .setEmoji(getEmojiByName("TICKETS.SUGGESTION", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(Object.keys(stats).length >= 24),
                new ButtonBuilder()
                    .setCustomId("save")
                    .setLabel("Save")
                    .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(Object.keys(changes).length === 0),
            );

        let embed = new EmojiEmbed()
            .setTitle("Stats Channels")
            .setDescription(description + "\n\n" + createPageIndicator(Object.keys(stats).length, page))
            .setEmoji("SETTINGS.STATS.GREEN")
            .setStatus("Success")

        interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(pageSelect),
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(actionSelect),
                row
            ]
        });
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id && i.message.id === m.id, time: 30000 });
        } catch (e) {
            closed = true;
            continue;
        }
        if (i.isStringSelectMenu()) {
            switch(i.customId) {
                case "page":
                    page = Object.keys(stats).indexOf(i.values[0]!);
                    await i.deferUpdate();
                    break;
                case "action":
                    if(!changes[currentID]) changes[currentID] = {};
                    switch(i.values[0]!) {
                        case "edit":
                            await i.showModal(
                                new Discord.ModalBuilder()
                                    .setCustomId("modal")
                                    .setTitle(`Stats channel name`)
                                    .addComponents(
                                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                                            new TextInputBuilder()
                                                .setCustomId("ex1")
                                                .setLabel("Server Info (1/3)")
                                                .setPlaceholder(
                                                    `{serverName} - This server's name\n\n` +
                                                    `These placeholders will be replaced with the server's name, etc..`
                                                )
                                                .setMaxLength(1)
                                                .setRequired(false)
                                                .setStyle(Discord.TextInputStyle.Paragraph)
                                        ),
                                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                                            new TextInputBuilder()
                                                .setCustomId("ex2")
                                                .setLabel("Member Counts (2/3) - {MemberCount:...}")
                                                .setPlaceholder(
                                                    `{:all} - Total member count\n` +
                                                    `{:humans} - Total non-bot users\n` +
                                                    `{:bots} - Number of bots\n`
                                                )
                                                .setMaxLength(1)
                                                .setRequired(false)
                                                .setStyle(Discord.TextInputStyle.Paragraph)
                                        ),
                                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                                            new TextInputBuilder()
                                                .setCustomId("ex3")
                                                .setLabel("Latest Member (3/3) - {member:...}")
                                                .setPlaceholder(
                                                        `{:name} - The members name\n`
                                                )
                                                .setMaxLength(1)
                                                .setRequired(false)
                                                .setStyle(Discord.TextInputStyle.Paragraph)
                                        ),
                                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                                            new TextInputBuilder()
                                                .setCustomId("text")
                                                .setLabel("Channel name input")
                                                .setMaxLength(1000)
                                                .setRequired(true)
                                                .setStyle(Discord.TextInputStyle.Short)
                                                .setValue(current.name)
                                        )
                                    )
                            );
                            await interaction.editReply({
                                embeds: [
                                    new EmojiEmbed()
                                        .setTitle("Stats Channel")
                                        .setDescription("Modal opened. If you can't see it, click back and try again.")
                                        .setStatus("Success")
                                        .setEmoji("SETTINGS.STATS.GREEN")
                                ],
                                components: [
                                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                                        new ButtonBuilder()
                                            .setLabel("Back")
                                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                            .setStyle(ButtonStyle.Primary)
                                            .setCustomId("back")
                                    )
                                ]
                            });
                            let out: Discord.ModalSubmitInteraction | null;
                            try {
                                out = await modalInteractionCollector(
                                    m,
                                    (m) => m.channel!.id === interaction.channel!.id,
                                    (_) => true
                                ) as Discord.ModalSubmitInteraction | null;
                            } catch (e) {
                                continue;
                            }
                            if (!out) continue
                            if (!out.fields) continue
                            if (out.isButton()) continue;
                            const newString = out.fields.getTextInputValue("text");
                            if (!newString) continue;
                            changes[currentID]!.name = newString;
                            break;
                        case "delete":
                            changes[currentID] = {};
                            await i.deferUpdate();
                            break;
                        case "toggleEnabled":
                            changes[currentID]!.enabled = !stats[currentID]!.enabled;
                            await i.deferUpdate();
                            break;
                    }
                    break;
            }
        } else if (i.isButton()) {
            await i.deferUpdate();
            switch(i.customId) {
                case "back":
                    page--;
                    break;
                case "next":
                    page++;
                    break;
                case "add":
                    break;
                case "save":
                    let changed = applyChanges(config.stats, changes);
                    singleNotify("statsChannelDeleted", interaction.guild.id, true)
                    config.stats = changed;
                    changes = {}
                    await client.database.guilds.write(interaction.guildId!, config);
            }
        }
        console.log(changes, config.stats);
    } while (!closed);
    } catch(e) {
        console.log(e)
    }
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