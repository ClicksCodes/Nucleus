import * as scan from '../utils/scanners.js'

export async function LinkCheck(message): Promise<boolean> {
    let links = message.content.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi) ?? []
    let detections = []
    const promises = links.map(async element => {
        try {
            if (element.match(/https?:\/\/[a-zA-Z]+\.?discord(app)?\.(com|net)\/?/)) return // Also matches discord.net, not enough of a bug
            console.log(1.1)
            element = await scan.testLink(element)
            console.log(1.2)
        } catch {}
        detections.push({tags: element.tags || [], safe: element.safe})
    });
    await Promise.all(promises);
    let types = [
        "PHISHING",  "DATING",            "TRACKERS",    "ADVERTISEMENTS", "FACEBOOK",
        "AMP",       "FACEBOOK TRACKERS", "IP GRABBERS", "PORN",
        "GAMBLING",  "MALWARE",           "PIRACY",      "RANSOMWARE",
        "REDIRECTS", "SCAMS",             "TORRENT",     "HATE",           "JUNK"
    ]
    let detectionsTypes = detections.map(element => {
        let type = types.find(type => element.tags.includes(type))
        if (type) return type
        // if (!element.safe) return "UNSAFE"
        return undefined
    }).filter(element => element !== undefined)
    return detectionsTypes.length > 0
}

export async function NSFWCheck(element): Promise<boolean> {
    try {
        let test = (await scan.testNSFW(element))
        //@ts-ignore
        return test.nsfw
    } catch {
        return false
    }
}

export async function SizeCheck(element): Promise<boolean> {
    if (element.height == undefined || element.width == undefined) return true
    if (element.height < 20 || element.width < 20) return false
    return true
}

export async function MalwareCheck(element): Promise<boolean> {
    try {
        //@ts-ignore
        return (await scan.testMalware(element)).safe
    } catch {
        return true
    }
}

export function TestString(string, soft, strict): object | null {
    for(let word of strict || []) {
        if (string.toLowerCase().includes(word)) {
            return {word: word, type: "strict"}
        }
    }
    for(let word of soft) {
        for(let word2 of string.match(/[a-z]+/gi) || []) {
            if (word2 == word) {
                return {word: word, type: "strict"}
            }
        }
    }
    return null
}

export async function TestImage(element): Promise<string | null> {
    return null;
}
