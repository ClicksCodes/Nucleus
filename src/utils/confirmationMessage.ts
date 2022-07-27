import Discord, { CommandInteraction, MessageActionRow, Message, MessageButton, TextInputComponent } from "discord.js";
import { modalInteractionCollector } from "./dualCollector.js";
import EmojiEmbed from "./generateEmojiEmbed.js"
import getEmojiByName from "./getEmojiByName.js";


interface CustomBoolean<T> {
    title: string;
    disabled: boolean;
    value: string | null;
    emoji: string | null;
    active: boolean;
    onClick: () => Promise<T>;
    response: T | null;
}

class confirmationMessage {
    interaction: CommandInteraction;
    title: string = "";
    emoji: string = "";
    description: string = "";
    color: string = "";
    customButtons: {[index:string]: CustomBoolean<unknown>} = {};
    inverted: boolean = false;
    reason: string | null = null;

    constructor(interaction: CommandInteraction) {
        this.interaction = interaction;
    }

    setTitle(title: string) { this.title = title; return this }
    setEmoji(emoji: string) { this.emoji = emoji; return this }
    setDescription(description: string) { this.description = description; return this }
    setColor(color: string) { this.color = color; return this }
    setInverted(inverted: boolean) { this.inverted = inverted; return this }
    addCustomBoolean(customId: string, title: string, disabled: boolean, callback: () => Promise<unknown> | null, callbackClicked: string | null, emoji?: string, initial?: boolean) {        this.customButtons[customId] = {
            title: title,
            disabled: disabled,
            value: callbackClicked,
            emoji: emoji,
            active: initial ?? false,
            onClick: callback ?? (() => null),
            response: null,
        }
        return this;
    }
    addReasonButton(reason: string) {
        this.reason = reason;
        return this;
    }
    async send(editOnly?: boolean) {
        while (true) {
            let fullComponents = [
                new Discord.MessageButton()
                    .setCustomId("yes")
                    .setLabel("Confirm")
                    .setStyle(this.inverted ? "SUCCESS" : "DANGER")
                    .setEmoji(getEmojiByName("CONTROL.TICK", "id")),
                new Discord.MessageButton()
                    .setCustomId("no")
                    .setLabel("Cancel")
                    .setStyle("SECONDARY")
                    .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
            ]
            Object.entries(this.customButtons).forEach(([k, v]) => {
                fullComponents.push(new Discord.MessageButton()
                    .setCustomId(k)
                    .setLabel(v.title)
                    .setStyle(v.active ? "SUCCESS" : "PRIMARY")
                    .setEmoji(getEmojiByName(v.emoji, "id"))
                    .setDisabled(v.disabled))
            })
            if (this.reason !== null) fullComponents.push(new Discord.MessageButton()
                .setCustomId("reason")
                .setLabel(`Edit Reason`)
                .setStyle("PRIMARY")
                .setEmoji(getEmojiByName("ICONS.EDIT", "id"))
                .setDisabled(false)
            )
            let components = []
            for (let i = 0; i < fullComponents.length; i += 5) {
                components.push(new MessageActionRow().addComponents(fullComponents.slice(i, i + 5)));
            }
            let object = {
                embeds: [
                    new EmojiEmbed()
                        .setEmoji(this.emoji)
                        .setTitle(this.title)
                        .setDescription(this.description + "\n\n" + Object.values(this.customButtons).map(v => {
                            if (v.value === null) return "";
                            return v.active ? `*${v.value}*\n` : "";
                        }).join(""))
                        .setStatus(this.color)
                ],
                components: components,
                ephemeral: true,
                fetchReply: true
            }
            let m;
            try {
                if ( editOnly ) {
                    m = await this.interaction.editReply(object);
                } else {
                    m = await this.interaction.reply(object)
                }
            } catch { return { cancelled: true } }
            let component;
            try {
                component = await (m as Message).awaitMessageComponent({filter: (m) => m.user.id === this.interaction.user.id, time: 300000});
            } catch (e) {
                return { success: false, components: this.customButtons };
            }
            if (component.customId === "yes") {
                component.deferUpdate();
                for (let [k, v] of Object.entries(this.customButtons)) {
                    if (!v.active) continue
                    try { v.response = await v.onClick(); }
                    catch (e) { console.log(e) }
                };
                return { success: true, components: this.customButtons };
            } else if (component.customId === "no") {
                component.deferUpdate();
                return { success: false, components: this.customButtons };
            } else if (component.customId === "reason") {
                await component.showModal(new Discord.Modal().setCustomId("modal").setTitle(`Editing reason`).addComponents(
                    new MessageActionRow<TextInputComponent>().addComponents(new TextInputComponent()
                        .setCustomId("reason")
                        .setLabel("Reason")
                        .setMaxLength(2000)
                        .setRequired(false)
                        .setStyle("PARAGRAPH")
                        .setPlaceholder("Spammed in #general")
                        .setValue(this.reason ? this.reason : "")
                    )
                ))
                await this.interaction.editReply({
                    embeds: [new EmojiEmbed()
                        .setTitle(this.title)
                        .setDescription("Modal opened. If you can't see it, click back and try again.")
                        .setStatus(this.color)
                        .setEmoji(this.emoji)
                    ], components: [new MessageActionRow().addComponents([new MessageButton()
                        .setLabel("Back")
                        .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                        .setStyle("PRIMARY")
                        .setCustomId("back")
                    ])]
                });
                let out;
                try {
                    out = await modalInteractionCollector(m, (m) => m.channel.id === this.interaction.channel.id, (m) => m.customId === "reason")
                } catch (e) { return {} }
                if (out.fields) { return { newReason: out.fields.getTextInputValue("reason") ?? "" }; }
                else { return { newReason: this.reason } }
            } else {
                component.deferUpdate();
                this.customButtons[component.customId].active = !this.customButtons[component.customId].active;
                return { components: this.customButtons };
            }
        }
    }
}

export default confirmationMessage;
