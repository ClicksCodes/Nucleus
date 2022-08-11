const forceCaps = ["ID", "NSFW", "URL"];

export function capitalize(s: string) {
    s = s.replace(/([A-Z])/g, " $1");
    s = s
        .split(" ")
        .map((word) => {
            return forceCaps.includes(word.toUpperCase())
                ? word.toUpperCase()
                : (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase().replace("discord", "Discord");
        })
        .join(" ");
    return s;
}

export function toCapitals(s: string) {
    if (s === "") return "";
    return s[0]!.toUpperCase() + s.slice(1).toLowerCase();
}

function keyValueList(data: Record<string, string>) {
    let out = "";
    Object.entries(data).map(([key, value]) => {
        out += `**${capitalize(key)}:** ${value}\n`;
    });
    return out;
}

export default keyValueList;
