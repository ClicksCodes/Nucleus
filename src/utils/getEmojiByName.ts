import emojis from "../config/emojis.json" assert { type: "json" };

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
        if (Array.isArray(id)) {
            id = id[parseInt(part)];
        } else {
            id = id[part];
        }
    }
    if (typeof id !== "string" && id !== undefined) {
        throw new Error(`Emoji ${name} not found`);
    }
    if (format === "id") {
        if (id === undefined) return "0";
        return id.toString();
    }
    if (id === undefined) {
        return "";
    } else if (id.toString().startsWith("a")) {
        return `<a:_:${id.toString().slice(1, id.toString().length)}>`;
    }
    return `<:_:${id}>`;
}

export default getEmojiByName;
