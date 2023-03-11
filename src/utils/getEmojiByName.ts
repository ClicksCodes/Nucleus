import emojis from "../config/emojis.js"
import _ from "lodash";

interface EmojisIndex {
    [key: string]: string | EmojisIndex | EmojisIndex[];
}

const EMOJIPATHS: string[] = [];

function getEmojiPaths(obj: EmojisIndex, path: string[] = []) {
    for (const key in obj) {
        if (typeof obj[key] === "string") {
            EMOJIPATHS.push([...path, key].join("."));
        } else {
            getEmojiPaths(obj[key] as EmojisIndex, [...path, key]);
        }
    }
}
getEmojiPaths(emojis);


function getEmojiByName(name: typeof EMOJIPATHS[number], format?: string): string {
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
