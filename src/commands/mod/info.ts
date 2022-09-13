import type { HistorySchema } from "../../utils/database.js";
import Discord, {
    CommandInteraction,
    GuildMember,
    Interaction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    TextInputComponent,
    ButtonStyle
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import client from "../../utils/client.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";
import pageIndicator from "../../utils/createPageIndicator.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("info")
        .setDescription("Shows moderator information about a user")
        .addUserOption((option) =>
            option.setName("user").setDescription("The user to get information about").setRequired(true)
        );

const types: Record<string, { emoji: string; text: string }> = {
    warn: { emoji: "PUNISH.WARN.YELLOW", text: "Warned" },
    mute: { emoji: "PUNISH.MUTE.YELLOW", text: "Muted" },
    unmute: { emoji: "PUNISH.MUTE.GREEN", text: "Unmuted" },
    join: { emoji: "MEMBER.JOIN", text: "Joined" },
    leave: { emoji: "MEMBER.LEAVE", text: "Left" },
    kick: { emoji: "MEMBER.KICK", text: "Kicked" },
    softban: { emoji: "PUNISH.SOFTBAN", text: "Softbanned" },
    ban: { emoji: "MEMBER.BAN", text: "Banned" },
    unban: { emoji: "MEMBER.UNBAN", text: "Unbanned" },
    purge: { emoji: "PUNISH.CLEARHISTORY", text: "Messages cleared" },
    nickname: { emoji: "PUNISH.NICKNAME.YELLOW", text: "Nickname changed" }
};

function historyToString(history: HistorySchema) {
    if (!Object.keys(types).includes(history.type)) throw new Error("Invalid history type");
    let s = `${getEmojiByName(types[history.type]!.emoji)} ${history.amount ? history.amount + " " : ""}${
        types[history.type]!.text
    } on <t:${Math.round(history.occurredAt.getTime() / 1000)}:F>`;
    if (history.moderator) {
        s += ` by <@${history.moderator}>`;
    }
    if (history.reason) {
        s += `\n**Reason:**\n> ${history.reason}`;
    }
    if (history.before) {
        s += `\n**Before:**\n> ${history.before}`;
    }
    if (history.after) {
        s += `\n**After:**\n> ${history.after}`;
    }
    return s + "\n";
}

class TimelineSection {
    name: string = "";
    content: { data: HistorySchema; rendered: string }[] = [];

    addContent = (content: { data: HistorySchema; rendered: string }) => {
        this.content.push(content);
        return this;
    };
    contentLength = () => {
        return this.content.reduce((acc, cur) => acc + cur.rendered.length, 0);
    };
    generateName = () => {
        const first = Math.round(this.content[0]!.data.occurredAt.getTime() / 1000);
        const last = Math.round(this.content[this.content.length - 1]!.data.occurredAt.getTime() / 1000);
        if (first === last) {
            return (this.name = `<t:${first}:F>`);
        }
        return (this.name = `<t:${first}:F> - <t:${last}:F>`);
    };
}

const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

async function showHistory(member: Discord.GuildMember, interaction: CommandInteraction) {
    let currentYear = new Date().getFullYear();
    let pageIndex: number | null = null;
    let history, current: TimelineSection;
    let m: Message;
    let refresh = true;
    let filteredTypes: string[] = [];
    let openFilterPane = false;
    let timedOut = false;
    let showHistorySelected = false;
    while (!timedOut && !showHistorySelected) {
        if (refresh) {
            history = await client.database.history.read(member.guild.id, member.id, currentYear);
            history = history
                .sort(
                    (a: { occurredAt: Date }, b: { occurredAt: Date }) =>
                        b.occurredAt.getTime() - a.occurredAt.getTime()
                )
                .reverse();
            if (openFilterPane) {
                let tempFilteredTypes = filteredTypes;
                if (filteredTypes.length === 0) {
                    tempFilteredTypes = Object.keys(types);
                }
                history = history.filter((h: { type: string }) => tempFilteredTypes.includes(h.type));
            }
            refresh = false;
        }
        const groups: TimelineSection[] = [];
        if (history.length > 0) {
            current = new TimelineSection();
            history.forEach((event: HistorySchema) => {
                if (current.contentLength() + historyToString(event).length > 2000 || current.content.length === 5) {
                    groups.push(current);
                    current.generateName();
                    current = new TimelineSection();
                }
                current.addContent({
                    data: event,
                    rendered: historyToString(event)
                });
            });
            current.generateName();
            groups.push(current);
            if (pageIndex === null) {
                pageIndex = groups.length - 1;
            }
        }
        if (pageIndex === null) pageIndex = 0;
        const components = (
            openFilterPane
                ? [
                      new ActionRowBuilder().addComponents([
                          new Discord.SelectMenuBuilder()
                              .setOptions(
                                  Object.entries(types).map(([key, value]) => ({
                                      label: value.text,
                                      value: key,
                                      default: filteredTypes.includes(key),
                                      emoji: client.emojis.resolve(getEmojiByName(value.emoji, "id"))
                                  }))
                              )
                              .setMinValues(1)
                              .setMaxValues(Object.keys(types).length)
                              .setCustomId("filter")
                              .setPlaceholder("Select at least one event")
                      ])
                  ]
                : []
        ).concat([
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId("prevYear")
                    .setLabel((currentYear - 1).toString())
                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("prevPage").setLabel("Previous page").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("today").setLabel("Today").setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("nextPage")
                    .setLabel("Next page")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex >= groups.length - 1 && currentYear === new Date().getFullYear()),
                new ButtonBuilder()
                    .setCustomId("nextYear")
                    .setLabel((currentYear + 1).toString())
                    .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentYear === new Date().getFullYear())
            ]),
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setLabel("Mod notes")
                    .setCustomId("modNotes")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(getEmojiByName("ICONS.EDIT", "id")),
                new ButtonBuilder()
                    .setLabel("Filter")
                    .setCustomId("openFilter")
                    .setStyle(openFilterPane ? ButtonStyle.Success : ButtonStyle.Primary)
                    .setEmoji(getEmojiByName("ICONS.FILTER", "id"))
            ])
        ]);
        const end =
            "\n\nJanuary " +
            currentYear.toString() +
            pageIndicator(Math.max(groups.length, 1), groups.length === 0 ? 1 : pageIndex) +
            (currentYear === new Date().getFullYear() ? monthNames[new Date().getMonth()] : "December") +
            " " +
            currentYear.toString();
        if (groups.length > 0) {
            const toRender = groups[Math.min(pageIndex, groups.length - 1)]!;
            m = (await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("MEMBER.JOIN")
                        .setTitle("Moderation history for " + member.user.username)
                        .setDescription(
                            `**${toRender.name}**\n\n` + toRender.content.map((c) => c.rendered).join("\n") + end
                        )
                        .setStatus("Success")
                        .setFooter({
                            text: openFilterPane && filteredTypes.length ? "Filters are currently enabled" : ""
                        })
                ],
                components: components
            })) as Message;
        } else {
            m = (await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("MEMBER.JOIN")
                        .setTitle("Moderation history for " + member.user.username)
                        .setDescription(`**${currentYear}**\n\n*No events*` + "\n\n" + end)
                        .setStatus("Success")
                        .setFooter({
                            text: openFilterPane && filteredTypes.length ? "Filters are currently enabled" : ""
                        })
                ],
                components: components
            })) as Message;
        }
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("MEMBER.JOIN")
                        .setTitle("Moderation history for " + member.user.username)
                        .setDescription(m.embeds[0]!.description!)
                        .setStatus("Danger")
                        .setFooter({ text: "Message timed out" })
                ]
            });
            timedOut = true;
            continue;
        }
        i.deferUpdate();
        if (i.customId === "filter") {
            filteredTypes = (i as SelectMenuInteraction).values;
            pageIndex = null;
            refresh = true;
        }
        if (i.customId === "prevYear") {
            currentYear--;
            pageIndex = null;
            refresh = true;
        }
        if (i.customId === "nextYear") {
            currentYear++;
            pageIndex = null;
            refresh = true;
        }
        if (i.customId === "prevPage") {
            pageIndex!--;
            if (pageIndex! < 0) {
                pageIndex = null;
                currentYear--;
                refresh = true;
            }
        }
        if (i.customId === "nextPage") {
            pageIndex!++;
            if (pageIndex! >= groups.length) {
                pageIndex = 0;
                currentYear++;
                refresh = true;
            }
        }
        if (i.customId === "today") {
            currentYear = new Date().getFullYear();
            pageIndex = null;
            refresh = true;
        }
        if (i.customId === "modNotes") {
            showHistorySelected = true;
        }
        if (i.customId === "openFilter") {
            openFilterPane = !openFilterPane;
            refresh = true;
        }
    }
    return timedOut ? 0 : 1;
}

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    let m: Message;
    const member = interaction.options.getMember("user") as Discord.GuildMember;
    await interaction.reply({
        embeds: [new EmojiEmbed().setEmoji("NUCLEUS.LOADING").setTitle("Downloading Data").setStatus("Danger")],
        ephemeral: true,
        fetchReply: true
    });
    let note;
    let firstLoad = true;
    let timedOut = false;
    while (!timedOut) {
        note = await client.database.notes.read(member.guild.id, member.id);
        if (firstLoad && !note) {
            await showHistory(member, interaction);
        }
        firstLoad = false;
        m = (await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("MEMBER.JOIN")
                    .setTitle("Mod notes for " + member.user.username)
                    .setDescription(note ? note : "*No note set*")
                    .setStatus("Success")
            ],
            components: [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setLabel(`${note ? "Modify" : "Create"} note`)
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("modify")
                        .setEmoji(getEmojiByName("ICONS.EDIT", "id")),
                    new ButtonBuilder()
                        .setLabel("View moderation history")
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("history")
                        .setEmoji(getEmojiByName("ICONS.HISTORY", "id"))
                ])
            ]
        })) as Message;
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch (e) {
            timedOut = true;
            continue;
        }
        if (i.customId === "modify") {
            await i.showModal(
                new Discord.Modal()
                    .setCustomId("modal")
                    .setTitle("Editing moderator note")
                    .addComponents(
                        new ActionRowBuilder<TextInputComponent>().addComponents(
                            new TextInputComponent()
                                .setCustomId("note")
                                .setLabel("Note")
                                .setMaxLength(4000)
                                .setRequired(false)
                                .setStyle("PARAGRAPH")
                                .setValue(note ? note : "")
                        )
                    )
            );
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Mod notes for " + member.user.username)
                        .setDescription("Modal opened. If you can't see it, click back and try again.")
                        .setStatus("Success")
                        .setEmoji("GUILD.TICKET.OPEN")
                ],
                components: [
                    new ActionRowBuilder().addComponents([
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId("back")
                    ])
                ]
            });
            let out;
            try {
                out = await modalInteractionCollector(
                    m,
                    (m: Interaction) =>
                        (m as MessageComponentInteraction | ModalSubmitInteraction).channelId === interaction.channelId,
                    (m) => m.customId === "modify"
                );
            } catch (e) {
                timedOut = true;
                continue;
            }
            if (out === null) {
                continue;
            } else if (out instanceof ModalSubmitInteraction) {
                const toAdd = out.fields.getTextInputValue("note") || null;
                await client.database.notes.create(member.guild.id, member.id, toAdd);
            } else {
                continue;
            }
        } else if (i.customId === "history") {
            i.deferUpdate();
            if (!(await showHistory(member, interaction))) return;
        }
    }
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has("MODERATE_MEMBERS"))
        throw new Error("You do not have the *Moderate Members* permission");
    return true;
};

export { command };
export { callback };
export { check };
