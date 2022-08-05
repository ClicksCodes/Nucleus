import { MessageEmbed } from "discord.js";
import getEmojiByName from "./getEmojiByName.js";

const colors = {
    "Danger": 0xF27878,
    "Warning": 0xF2D478,
    "Success": 0x68D49E
};

class EmojiEmbed extends MessageEmbed {
    _title = "";
    _emoji: string | null = null;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // This *is* meant to be an accessor rather than a property
    override get title() {
        if (!this._emoji) return this._title;
        return `${getEmojiByName(this._emoji)} ${this._title}`;
    }

    override set title(title: string) {
        this._title = title;
    }

    override setTitle(title: string) { this._title = title; return this; }
    setEmoji(emoji: string) { this._emoji = emoji; return this; }
    setStatus(color: "Danger" | "Warning" | "Success") { this.setColor(colors[color]); return this; }
}

export default EmojiEmbed;