import {
    ActionRowBuilder,
    APIMessageComponentEmoji,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    CommandInteraction,
    MessageCreateOptions,
    ModalBuilder,
    SlashCommandSubcommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import type Discord from "discord.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import lodash from "lodash";
import getEmojiByName from "../../utils/getEmojiByName.js";
import { modalInteractionCollector } from "../../utils/dualCollector.js";

export const command = new SlashCommandSubcommandBuilder()
    .setName("buttons")
    .setDescription("Create clickable buttons for verifying, role menus etc.");

interface Data {
    buttons: string[];
    title: string | null;
    description: string | null;
    color: number;
    channel: string | null;
}

const colors: Record<string, number> = {
    RED: 0xf27878,
    ORANGE: 0xe5ab71,
    YELLOW: 0xf2d478,
    GREEN: 0x65cc76,
    BLUE: 0x72aef5,
    PURPLE: 0xa358b2,
    PINK: 0xd46899,
    GRAY: 0x999999
};

const buttonNames: Record<string, string> = {
    verifybutton: "Verify",
    rolemenu: "Role Menu",
    createticket: "Create Ticket"
};

export const callback = async (interaction: CommandInteraction): Promise<void> => {
    const m = await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    });

    let closed = false;
    const data: Data = {
        buttons: [],
        title: null,
        description: null,
        color: colors["RED"]!,
        channel: interaction.channelId
    };
    do {
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("edit")
                .setLabel("Edit Embed")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(getEmojiByName("ICONS.EDIT") as APIMessageComponentEmoji)
                ,
            new ButtonBuilder()
                .setCustomId("send")
                .setLabel("Send")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!data.channel)
        );

        const colorSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("color")
                .setPlaceholder("Select a color")
                .setMinValues(1)
                .addOptions(
                    Object.keys(colors).map((color: string) => {
                        return new StringSelectMenuOptionBuilder()
                            .setLabel(lodash.capitalize(color))
                            .setValue(color)
                            .setEmoji(getEmojiByName("COLORS." + color, "id") as APIMessageComponentEmoji)
                            .setDefault(data.color === colors[color]);
                    })
                )
        );

        const buttonSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("button")
                .setPlaceholder("Select buttons to add")
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Verify")
                        .setValue("verifybutton")
                        .setDescription("Click to get verified in the server")
                        .setDefault(data.buttons.includes("verifybutton")),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Role Menu")
                        .setValue("rolemenu")
                        .setDescription("Click to customize your roles")
                        .setDefault(data.buttons.includes("rolemenu")),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Ticket")
                        .setValue("createticket")
                        .setDescription("Click to create a support ticket")
                        .setDefault(data.buttons.includes("createticket"))
                )
        );

        const channelMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setPlaceholder("Select a channel")
                .setChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildAnnouncement,
                    ChannelType.PublicThread,
                    ChannelType.AnnouncementThread
                )
        );
        let channelName = interaction.guild!.channels.cache.get(data.channel!)?.name;
        if (data.channel === interaction.channelId) channelName = "this channel";
        const embed = new EmojiEmbed()
            .setTitle(data.title ?? "No title set")
            .setDescription(data.description ?? "*No description set*")
            .setColor(data.color)
            .setFooter({ text: `Click the button below to edit the embed | The embed will be sent in ${channelName}` });

        await interaction.editReply({
            embeds: [embed],
            components: [colorSelect, buttonSelect, channelMenu, buttons]
        });

        let i: Discord.ButtonInteraction | Discord.ChannelSelectMenuInteraction | Discord.StringSelectMenuInteraction;
        try {
            i = (await interaction.channel!.awaitMessageComponent({
                filter: (i: Discord.Interaction) => i.user.id === interaction.user.id && i.isMessageComponent() && i.message.id === m.id,
                time: 300000
            })) as
                | Discord.ButtonInteraction
                | Discord.ChannelSelectMenuInteraction
                | Discord.StringSelectMenuInteraction;
        } catch (e) {
            closed = true;
            break;
        }
        if (i.isButton()) {
            switch (i.customId) {
                case "edit": {
                    await i.showModal(
                        new ModalBuilder()
                            .setCustomId("modal")
                            .setTitle(`Options for ${i.customId}`)
                            .addComponents(
                                new ActionRowBuilder<TextInputBuilder>().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("title")
                                        .setLabel("Title")
                                        .setMaxLength(256)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(data.title ?? "")
                                ),
                                new ActionRowBuilder<TextInputBuilder>().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("description")
                                        .setLabel("The text to display below the title")
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setValue(data.description ?? "")
                                )
                            )
                    );
                    await interaction.editReply({
                        embeds: [
                            new EmojiEmbed()
                                .setTitle("Button Editor")
                                .setDescription("Modal opened. If you can't see it, click back and try again.")
                                .setStatus("Success")
                                .setEmoji("GUILD.TICKET.OPEN")
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents([
                                new ButtonBuilder()
                                    .setLabel("Back")
                                    .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                    .setStyle(ButtonStyle.Primary)
                                    .setCustomId("back")
                            ])
                        ]
                    });
                    let out: Discord.ModalSubmitInteraction | null;
                    try {
                        out = (await modalInteractionCollector(
                            m,
                            interaction.user
                        )) as Discord.ModalSubmitInteraction | null;
                    } catch (e) {
                        closed = true;
                        continue;
                    }
                    if (!out || out.isButton()) continue;
                    data.title =
                        out.fields.getTextInputValue("title").length === 0
                            ? null
                            : out.fields.getTextInputValue("title");
                    data.description =
                        out.fields.getTextInputValue("description").length === 0
                            ? null
                            : out.fields.getTextInputValue("description");
                    break;
                }
                case "send": {
                    await i.deferUpdate();
                    const channel = interaction.guild!.channels.cache.get(data.channel!) as Discord.TextChannel;
                    const messageData: MessageCreateOptions = { };
                    for (const button of data.buttons) {
                        messageData.components = [new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId(button)
                                .setLabel(buttonNames[button]!)
                                .setStyle(ButtonStyle.Primary)
                        )];
                    }
                    if (data.title || data.description || data.color) {
                        const e = new EmojiEmbed();
                        if (data.title) e.setTitle(data.title);
                        if (data.description) e.setDescription(data.description);
                        if (data.color) e.setColor(data.color);
                        messageData.embeds = [e];
                    }
                    await channel.send(messageData);
                    break;
                }
            }
        } else if (i.isStringSelectMenu()) {
            try {
                await i.deferUpdate();
            } catch (err) {
                console.log(err);
            }
            switch (i.customId) {
                case "color": {
                    data.color = colors[i.values[0]!]!;
                    break;
                }
                case "button": {
                    data.buttons = i.values;
                    break;
                }
            }
        } else {
            await i.deferUpdate();
            data.channel = i.values[0]!;
        }
    } while (!closed);
    await interaction.deleteReply();
};

export const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageMessages"))
        return "You must have the *Manage Messages* permission to use this command";
    return true;
};
