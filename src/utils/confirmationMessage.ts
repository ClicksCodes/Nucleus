import Discord, { CommandInteraction, MessageActionRow, Message } from "discord.js";
import generateEmojiEmbed from "./generateEmojiEmbed.js"
import getEmojiByName from "./getEmojiByName.js";

class confirmationMessage {
    interaction: CommandInteraction;
    title: string;
    emoji: string;
    description: string;
    color: string;
    customCallback: () => any;
    customButtonTitle: string;
    customButtonDisabled: boolean;
    customCallbackString: string = "";
    customCallbackClicked: boolean = false;
    customCallbackResponse: any = null;
    customBoolean: () => any;
    customBooleanClicked: boolean = null;
    inverted: boolean;

    constructor(interaction: CommandInteraction) {
        this.interaction = interaction;

        this.title = "";
        this.emoji = "";
        this.description = "";
        this.color = "";
        this.inverted = false;
        this.customCallback = () => {};
        this.customBoolean = () => {};
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


    async send(editOnly?: boolean) {
        while (true) {
            let object = {
                embeds: [
                    new generateEmojiEmbed()
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
            }
        }
    }
}

export default confirmationMessage;