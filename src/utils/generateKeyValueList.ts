const forceCaps = [
    "ID",
    "NSFW"
]

export function capitalize(s: string) {
    s = s.replace(/([A-Z])/g, ' $1');
    return forceCaps.includes(s.toUpperCase()) ? s.toUpperCase() : s[0]
        .toUpperCase() + s.slice(1)
        .toLowerCase()
        .replace("discord", "Discord");
}

export function toCapitals(s: string) {
    return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

function keyValueList(data) {
    let out = "";
    Object.entries(data).map(([key, value]) => {
        out += `**${capitalize(key)}:** ${value}\n`
    })
    return out;
}

export default keyValueList;