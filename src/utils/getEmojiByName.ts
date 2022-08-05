import emojis from "../config/emojis.json" assert {type: "json"};

interface EmojisIndex {
    [key: string]: string | EmojisIndex | EmojisIndex[];
}

function getEmojiByName(name: string, format?: string): string {
    const split = name.split(".");
    let id: string | EmojisIndex | EmojisIndex[] | undefined = emojis;
    split.forEach(part => {
        if (typeof id === "string" || id === undefined) {
            throw new Error(`Emoji ${name} not found`);
        }
        if (Array.isArray(id)) {
            id = id[parseInt(part)];
        } else {
            id = id[part];
        }
    });
    if ( format === "id" ) {
        if (id === undefined) return "0";
        return id.toString();
    }
    if (id === undefined) {
        return "<a:_:946346549271732234>";
    } else if (id.toString().startsWith("a")) {
        return `<a:_:${id.toString().slice(1, id.toString().length)}>`;
    }
    return `<:_:${id}>`;
}

export default getEmojiByName;
