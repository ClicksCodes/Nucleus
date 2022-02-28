import Discord, { CommandInteraction, MessageActionRow, Message } from "discord.js";
import EmojiEmbed from "./generateEmojiEmbed.js"
import getEmojiByName from "./getEmojiByName.js";

class confirmationMessage {
    interaction: CommandInteraction;
    title: string;
    emoji: string;
    description: string;
    color: string;

    constructor(interaction: CommandInteraction) {
        this.interaction = interaction;

        this.title = "";
        this.emoji = "";
        this.description = "";
        this.color = "";
    }

    setTitle(title: string) { this.title = title; return this }
    setEmoji(emoji: string) { this.emoji = emoji; return this }
    setDescription(description: string) { this.description = description; return this }
    setColor(color: string) { this.color = color; return this }

    async send(editOnly?: boolean) {
        let object = {
            embeds: [
                new EmojiEmbed()
                    .setEmoji(this.emoji)
                    .setTitle(this.title)
                    .setDescription(this.description)
                    .setStatus(this.color)
            ],
            components: [
                new MessageActionRow().addComponents([
                    new Discord.MessageButton()
                        .setCustomId("yes")
                        .setLabel("Yes")
                        .setStyle("SUCCESS")
                        .setEmoji(getEmojiByName("CONTROL.TICK", "id")),
                    new Discord.MessageButton()
                        .setCustomId("no")
                        .setLabel("Cancel")
                        .setStyle("DANGER")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                ])
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
            return false;  // TODO: Check the type of the error; change the error message here
        }
        component.deferUpdate();

        return component.customId === "yes"
    }
}

export default confirmationMessage;