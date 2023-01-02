import { EmbedBuilder } from "@discordjs/builders";
import getEmojiByName from "./getEmojiByName.js";

const colors = {
    Danger: 0xf27878,
    Warning: 0xf2d478,
    Success: 0x68d49e
};

class EmojiEmbed extends EmbedBuilder {
    _title = "";
    _emoji: string | null = null;
    description = "";

    _generateTitle() {
        if (this._emoji) { return `${getEmojiByName(this._emoji)} ${this._title}`; }
        return this._title;
    }

    override setTitle(title: string) {
        this._title = title;
        super.setTitle(this._generateTitle());
        return this;
    }
    override setDescription(description: string) {
        this.description = description;
        super.setDescription(description);
        return this;
    }
    setEmoji(emoji: string) {
        this._emoji = emoji;
        super.setTitle(this._generateTitle());
        return this;
    }
    setStatus(color: "Danger" | "Warning" | "Success") {
        this.setColor(colors[color]);
        return this;
    }
}


export default EmojiEmbed;
