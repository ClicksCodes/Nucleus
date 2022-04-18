import emojis from '../config/emojis.json' assert {type: 'json'};

function getEmojiByName(name: string, format?: string): string {
    let split = name.split(".");
    let id = emojis
    split.forEach(part => {
        id = id[part];
    });
    if ( format === "id" ) {
        if (id === undefined) return "0";
        return id.toString();
    }
    if (id === undefined) {
        return `<a:_:946346549271732234>`
    } else if (id.toString().startsWith("a")) {
        return `<a:_:${id.toString().slice(1, id.toString().length)}>`
    }
    return `<:_:${id}>`;
}

export default getEmojiByName;
