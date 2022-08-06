import { MessageEmbed } from "discord.js";
import getEmojiByName from "./getEmojiByName.js";

const colors = {
    Danger: 0xf27878,
    Warning: 0xf2d478,
    Success: 0x68d49e
};

class EmojiEmbed extends MessageEmbed {
    _title = "";
    _emoji: string | null = null;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // This *is* meant to be an accessor rather than a property
    override get title() {
        if (!this._emoji) return this._title;
        return `${getEmojiByName(this._emoji)} ${this._title}`;
    }

    override set title(title: string) {
        this._title = title;
    }

    override setTitle(title: string) {
        this._title = title;
        return this;
    }
    setEmoji(emoji: string) {
        this._emoji = emoji;
        return this;
    }
    setStatus(color: "Danger" | "Warning" | "Success") {
        this.setColor(colors[color]);
        return this;
    }
}

export default EmojiEmbed;
