import emojis from '../config/emojis.json' assert {type: 'json'};

function getEmojiByName(name: string): string {
    let split = name.split(".");
    let id = emojis
    split.forEach(part => {
        id = id[part];
    });
    return `<:a:${id}>`;
}

export default getEmojiByName;
