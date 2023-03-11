import emojis from "../config/emojis.json" assert { type: "json" };
import _ from "lodash";

interface EmojisIndex {
    [key: string]: string | EmojisIndex | EmojisIndex[];
}

function getEmojiByName(name: string | null, format?: string): string {
    if (!name) return "";
    const parts = name.split(".");
    let id: string | EmojisIndex | EmojisIndex[] | undefined = emojis;
    for (const part of parts) {
        if (typeof id === "string" || id === undefined) {
            throw new Error(`Emoji ${name} not found`);
        }
        if (_.isArray(id)) {
            id = id[parseInt(part)];
        } else {
            id = id[part];
        }
    }
    if (typeof id !== "string" && id !== undefined) {
        throw new Error(`Emoji ${name} not found`);
    }
    return getEmojiFromId(id, format);
}

function getEmojiFromId(id: string | undefined, format?: string): string {
    if (format === "id") {
        if (id === undefined) return "0";
        return id.toString();
    }
    if (id === undefined) {
        return "";
    } else if (id.toString().startsWith("a")) {
        return `<a:N:${id.toString().slice(1, id.toString().length)}>`;
    }
    return `<:N:${id}>`;
}

export default getEmojiByName;
