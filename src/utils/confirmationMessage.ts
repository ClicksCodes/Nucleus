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
    inverted: boolean;

    constructor(interaction: CommandInteraction) {
        this.interaction = interaction;

        this.title = "";
        this.emoji = "";
        this.description = "";
        this.color = "";
        this.inverted = false
        this.customCallback = () => {}
    }

    setTitle(title: string) { this.title = title; return this }
    setEmoji(emoji: string) { this.emoji = emoji; return this }
    setDescription(description: string) { this.description = description; return this }
    setColor(color: string) { this.color = color; return this }
    setInverted(inverted: boolean) { this.inverted = inverted; return this }
    addCustomCallback(title: string, disabled: boolean, callback: () => any, callbackClicked: string) {
        this.customButtonTitle = title;
        this.customButtonDisabled = disabled;
        this.customCallback = callback;
        this.customCallbackString = callbackClicked;
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
                        .setFooter({text: this.customCallbackClicked ? this.customCallbackString : ""})
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
                        .setStyle("PRIMARY")
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
                component = await (m as Message).awaitMessageComponent({filter: (m) => m.user.id === this.interaction.user.id, time: 2.5 * 60 * 1000});
            } catch (e) {
                return { success: false, buttonClicked: this.customCallbackClicked, response: this.customCallbackResponse };
            }
            if (component.customId === "yes") {
                component.deferUpdate();
                return { success: true, buttonClicked: this.customCallbackClicked, response: this.customCallbackResponse };
            } else if (component.customId === "no") {
                component.deferUpdate();
                return { success: false, buttonClicked: this.customCallbackClicked, response: this.customCallbackResponse };
            } else if (component.customId === "custom") {
                component.deferUpdate();
                this.customCallbackResponse = this.customCallback();
                this.customCallbackClicked = true;
                this.customButtonDisabled = true;
                editOnly = true;
            }
        }
    }
}

export default confirmationMessage;