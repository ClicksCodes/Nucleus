import * as scan from '../utils/scanners.js'

export async function LinkCheck(message): Promise<boolean> {
    let links = message.content.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi) ?? []
    let detections = []
    const promises = links.map(async element => {
        try {
            element = await scan.testLink(element)
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
        if (!element.safe) return "UNSAFE"
        return undefined
    }).filter(element => element !== undefined)
    return detectionsTypes.length > 0
}

export async function NSFWCheck(element): Promise<boolean> {
    try {
        //@ts-ignore
        let test = (await scan.testNSFW(element)).nsfw
        return test
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

export function TestString(string, soft, strict): string {
    for(let word of strict || []) {
        if (string.toLowerCase().includes(word)) {
            return "strict"
        }
    }
    for(let word of soft) {
        for(let word2 of string.match(/[a-z]+/gi) || []) {
            if (word2 == word) {
                return "loose"
            }
        }
    }
    return "none"
}