import Discord, { CommandInteraction, MessageActionRow, Message, MessageButton, TextInputComponent } from "discord.js";
import { modalInteractionCollector } from "./dualCollector.js";
import EmojiEmbed from "./generateEmojiEmbed.js"
import getEmojiByName from "./getEmojiByName.js";

class confirmationMessage {
    interaction: CommandInteraction;
    title: string = "";
    emoji: string = "";
    description: string = "";
    color: string = "";
    customCallback: () => any = () => {};
    customButtonTitle: string;
    customButtonDisabled: boolean;
    customCallbackString: string = "";
    customCallbackClicked: boolean = false;
    customCallbackResponse: any = null;
    customBoolean: () => any = () => {}; // allow multiple booleans
    customBooleanClicked: boolean = null;
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
    addCustomCallback(title: string, disabled: boolean, callback: () => any, callbackClicked: string) {
        if (this.customButtonTitle) return this
        this.customButtonTitle = title;
        this.customButtonDisabled = disabled;
        this.customCallback = callback;
        this.customCallbackString = callbackClicked;
        return this;
    }
    addCustomBoolean(title: string, disabled: boolean, callback: () => any, callbackClicked: string) {
        if (this.customButtonTitle) return this
        this.customButtonTitle = title;
        this.customButtonDisabled = disabled;
        this.customBoolean = callback;
        this.customCallbackString = callbackClicked;
        this.customBooleanClicked = false;
        return this;
    }
    addReasonButton(reason: string) {
        this.reason = reason;
        return this;
    }
    async send(editOnly?: boolean) {
        while (true) {
            let object = {
                embeds: [
                    new EmojiEmbed()
                        .setEmoji(this.emoji)
                        .setTitle(this.title)
                        .setDescription(this.description)
                        .setStatus(this.color)
                        .setFooter({text: (this.customBooleanClicked ?? this.customCallbackClicked) ? this.customCallbackString : ""})
                ],
                components: [
                    new MessageActionRow().addComponents([
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
                    ].concat(this.customButtonTitle ? [new Discord.MessageButton()
                        .setCustomId("custom")
                        .setLabel(this.customButtonTitle)
                        .setStyle(this.customBooleanClicked !== null ?
                            ( this.customBooleanClicked ? "SUCCESS" : "PRIMARY" ) :
                            "PRIMARY"
                        )
                        .setDisabled(this.customButtonDisabled)
                        .setEmoji(getEmojiByName("CONTROL.TICKET", "id"))
                    ] : [])
                    .concat(this.reason !== null ? [new Discord.MessageButton()
                        .setCustomId("reason")
                        .setLabel(`Edit Reason`)
                        .setStyle("PRIMARY")
                        .setEmoji(getEmojiByName("ICONS.EDIT", "id"))
                    ] : []))
                ],
                ephemeral: true,
                fetchReply: true
            }
            let m;
            if ( editOnly ) {
                m = await this.interaction.editReply(object);
            } else {
                m = await this.interaction.reply(object)
            }
            let component;
            try {
                component = await (m as Message).awaitMessageComponent({filter: (m) => m.user.id === this.interaction.user.id, time: 300000});
            } catch (e) {
                return {
                    success: false,
                    buttonClicked: this.customBooleanClicked ?? this.customCallbackClicked,
                    response: this.customCallbackResponse
                };
            }
            if (component.customId === "yes") {
                component.deferUpdate();
                if (this.customBooleanClicked === true) this.customCallbackResponse = await this.customBoolean();
                return {
                    success: true,
                    buttonClicked: this.customBooleanClicked ?? this.customCallbackClicked,
                    response: this.customCallbackResponse
                };
            } else if (component.customId === "no") {
                component.deferUpdate();
                return {
                    success: false,
                    buttonClicked: this.customBooleanClicked ?? this.customCallbackClicked,
                    response: this.customCallbackResponse
                };
            } else if (component.customId === "custom") {
                component.deferUpdate();
                if (this.customBooleanClicked !== null) {
                    this.customBooleanClicked = !this.customBooleanClicked;
                } else {
                    this.customCallbackResponse = await this.customCallback();
                    this.customCallbackClicked = true;
                    this.customButtonDisabled = true;
                }
                editOnly = true;
            } else if (component.customId === "reason") {
                await component.showModal(new Discord.Modal().setCustomId("modal").setTitle(`Editing reason`).addComponents(
                    // @ts-ignore
                    new MessageActionRow().addComponents(new TextInputComponent()
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
                    out = await modalInteractionCollector(m, (m) => m.channel.id == this.interaction.channel.id, (m) => m.customId == "reason")
                } catch (e) { continue }
                if (out.fields) {
                    return {newReason: out.fields.getTextInputValue("reason") ?? ""};
                } else { return { newReason: this.reason } }
            }
        }
    }
}

export default confirmationMessage;
