import { TextInputBuilder } from "discord.js";
import Discord, {
    CommandInteraction,
    Interaction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    ButtonStyle,
    TextInputStyle
} from "discord.js";
import { modalInteractionCollector } from "./dualCollector.js";
import EmojiEmbed from "./generateEmojiEmbed.js";
import getEmojiByName from "./getEmojiByName.js";

interface CustomBoolean<T> {
    title: string;
    disabled: boolean;
    value: string | null;
    notValue: string | null;
    emoji: string | undefined;
    active: boolean;
    onClick: () => Promise<T>;
    response: T | null;
}

class confirmationMessage {
    interaction: CommandInteraction;
    title = "";
    emoji = "";
    redEmoji: string | null = null;
    failedMessage: string | null = null;
    failedEmoji: string | null = null;
    failedStatus: "Success" | "Danger" | "Warning" | null = null;
    description = "";
    color: "Danger" | "Warning" | "Success" = "Success";
    customButtons: Record<string, CustomBoolean<unknown>> = {};
    inverted = false;
    reason: string | null = null;

    constructor(interaction: CommandInteraction) {
        this.interaction = interaction;
    }

    setTitle(title: string) {
        this.title = title;
        return this;
    }
    setEmoji(emoji: string) {
        this.emoji = emoji;
        return this;
    }
    setDescription(description: string, timedOut?: string) {
        this.description = description;
        if (timedOut) this.failedMessage = timedOut;
        return this;
    }
    setColor(color: "Danger" | "Warning" | "Success") {
        this.color = color;
        return this;
    }
    setInverted(inverted: boolean) {
        this.inverted = inverted;
        return this;
    }
    setFailedMessage(text: string, failedStatus: "Success" | "Danger" | "Warning" | null, failedEmoji: string | null = null) {
        this.failedMessage = text;
        this.failedStatus = failedStatus;
        this.failedEmoji = failedEmoji;
        return this;
    }
    addCustomBoolean(
        customId: string,
        title: string,
        disabled: boolean,
        callback: (() => Promise<unknown>) | null = async () => null,
        callbackClicked: string | null,
        callbackNotClicked: string | null,
        emoji?: string,
        initial?: boolean
    ) {
        this.customButtons[customId] = {
            title: title,
            disabled: disabled,
            value: callbackClicked,
            notValue: callbackNotClicked,
            emoji: emoji,
            active: initial ?? false,
            onClick: callback ?? (async () => null),
            response: null
        };
        return this;
    }
    addReasonButton(reason: string) {
        this.reason = reason;
        return this;
    }
    async send(editOnly?: boolean): Promise<{
        success?: boolean;
        cancelled?: boolean;
        components?: Record<string, CustomBoolean<unknown>>;
        newReason?: string;
    }> {
        let cancelled = false;
        let success: boolean | undefined = undefined;
        let returnComponents = false;
        let newReason = undefined;

        while (!cancelled && success === undefined && !returnComponents && !newReason) {
            const fullComponents = [
                new Discord.ButtonBuilder()
                    .setCustomId("yes")
                    .setLabel("Confirm")
                    .setStyle(this.inverted ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(getEmojiByName("CONTROL.TICK", "id")),
                new Discord.ButtonBuilder()
                    .setCustomId("no")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
            ];
            Object.entries(this.customButtons).forEach(([k, v]) => {
                const button = new Discord.ButtonBuilder()
                    .setCustomId(k)
                    .setLabel(v.title)
                    .setStyle(v.active ? ButtonStyle.Success : ButtonStyle.Primary)
                    .setDisabled(v.disabled);
                if (v.emoji !== undefined) button.setEmoji(getEmojiByName(v.emoji, "id"));
                fullComponents.push(button);
            });
            if (this.reason !== null)
                fullComponents.push(
                    new Discord.ButtonBuilder()
                        .setCustomId("reason")
                        .setLabel("Edit Reason")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(getEmojiByName("ICONS.EDIT", "id"))
                        .setDisabled(false)
                );
            const components = [];
            for (let i = 0; i < fullComponents.length; i += 5) {
                components.push(new ActionRowBuilder<
                    Discord.ButtonBuilder | Discord.StringSelectMenuBuilder |
                    Discord.RoleSelectMenuBuilder | Discord.UserSelectMenuBuilder
                >().addComponents(fullComponents.slice(i, i + 5)));
            }
            const object = {
                embeds: [
                    new EmojiEmbed()
                        .setEmoji(this.emoji)
                        .setTitle(this.title)
                        .setDescription(
                            this.description +
                                "\n\n" +
                                Object.values(this.customButtons)
                                    .map((v) => {
                                        if (v.active) {
                                            return v.value ? `*${v.value}*\n` : "";
                                        } else {
                                            return v.notValue ? `*${v.notValue}*\n` : "";
                                        }
                                    }).join("")
                        )
                        .setStatus(this.color)
                ],
                components: components,
                ephemeral: true,
                fetchReply: true
            };
            let m: Message;
            try {
                if (editOnly) {
                    m = (await this.interaction.editReply(object)) as unknown as Message;
                } else {
                    m = (await this.interaction.reply(object)) as unknown as Message;
                }
            } catch (e) {
                console.log(e);
                cancelled = true;
                continue;
            }
            let component;
            try {
                component = await m.awaitMessageComponent({
                    filter: (i) => i.user.id === this.interaction.user.id && i.channel!.id === this.interaction.channel!.id,
                    time: 300000
                });
            } catch (e) {
                success = false;
                break;
            }
            if (component.customId === "yes") {
                component.deferUpdate();
                for (const v of Object.values(this.customButtons)) {
                    if (!v.active) continue;
                    try {
                        v.response = await v.onClick();
                    } catch (e) {
                        console.log(e);
                    }
                }
                success = true;
                returnComponents = true;
                continue;
            } else if (component.customId === "no") {
                component.deferUpdate();
                success = false;
                returnComponents = true;
                continue;
            } else if (component.customId === "reason") {
                await component.showModal(
                    new Discord.ModalBuilder()
                        .setCustomId("modal")
                        .setTitle("Editing reason")
                        .addComponents(
                            new ActionRowBuilder<TextInputBuilder>().addComponents(
                                new TextInputBuilder()
                                    .setCustomId("reason")
                                    .setLabel("Reason")
                                    .setMaxLength(2000)
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setPlaceholder("Spammed in #general")
                                    .setValue(this.reason ? this.reason : "")
                            )
                        )
                );
                await this.interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle(this.title)
                            .setDescription("Modal opened. If you can't see it, click back and try again.")
                            .setStatus(this.color)
                            .setEmoji(this.emoji)
                    ],
                    components: [
                        new ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setLabel("Back")
                                .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                                .setStyle(ButtonStyle.Primary)
                                .setCustomId("back")
                        )
                    ]
                });
                let out;
                try {
                    out = await modalInteractionCollector(
                        m,
                        (m: Interaction) =>
                            (m as MessageComponentInteraction | ModalSubmitInteraction).channelId === this.interaction.channelId,
                        (m) => m.customId === "reason"
                    );
                } catch (e) {
                    cancelled = true;
                    continue;
                }
                if (out === null  || out.isButton()) {
                    cancelled = true;
                    continue;
                }
                if (out instanceof ModalSubmitInteraction) {
                    newReason = out.fields.getTextInputValue("reason");
                    continue;
                } else {
                    returnComponents = true;
                    continue;
                }
            } else {
                component.deferUpdate();
                this.customButtons[component.customId]!.active = !this.customButtons[component.customId]!.active;
                returnComponents = true;
                continue;
            }
        }
        const returnValue: Awaited<ReturnType<typeof this.send>> = {};

        if (cancelled) {
            await this.timeoutError()
            returnValue.cancelled = true;
        }
        if (success === false) {
            await this.interaction.editReply({
                embeds: [new EmojiEmbed()
                    .setTitle(this.title)
                    .setDescription(this.failedMessage ?? "*Message timed out*")
                    .setStatus(this.failedStatus ?? "Danger")
                    .setEmoji(this.failedEmoji ?? this.redEmoji ?? this.emoji)
                ], components: []
            });
            return {success: false}
        }
        if (returnComponents || success !== undefined) returnValue.components = this.customButtons;
        if (success !== undefined) returnValue.success = success;
        if (newReason) returnValue.newReason = newReason;

        const typedReturnValue = returnValue as {cancelled: true} |
        { success: boolean, components: Record<string, CustomBoolean<unknown>>, newReason?: string} |
        { newReason: string, components: Record<string, CustomBoolean<unknown>> } |
        { components: Record<string, CustomBoolean<unknown>> };

        return typedReturnValue;
    }

    async timeoutError(): Promise<void> {
        await this.interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle(this.title)
                    .setDescription("We closed this message because it was not used for a while.")
                    .setStatus("Danger")
                    .setEmoji("CONTROL.BLOCKCROSS")
            ],
            components: []
        })
    }
}

export default confirmationMessage;
