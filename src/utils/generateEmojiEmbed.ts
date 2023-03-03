import { EmbedBuilder } from "discord.js";
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
        if (this._emoji && !this._title) return getEmojiByName(this._emoji)
        if (this._emoji) { return `${getEmojiByName(this._emoji)} ${this._title}`; }
        if (this._title) { return this._title };
        return "";
    }

    override setTitle(title: string) {
        this._title = title;
        const proposedTitle = this._generateTitle();
        if (proposedTitle) super.setTitle(proposedTitle);
        return this;
    }
    override setDescription(description: string) {
        this.description = description;
        super.setDescription(description);
        return this;
    }
    setEmoji(emoji: string) {
        this._emoji = emoji;
        const proposedTitle = this._generateTitle();
        if (proposedTitle) super.setTitle(proposedTitle);
        return this;
    }
    setStatus(color: "Danger" | "Warning" | "Success") {
        this.setColor(colors[color]);
        return this;
    }
}


export default EmojiEmbed;
