import fetch from "node-fetch";
import FormData from "form-data";
import { writeFileSync, createReadStream } from "fs";
import generateFileName from "../utils/temp/generateFileName.js";
import Tesseract from "node-tesseract-ocr";
import type Discord from "discord.js";
import client from "../utils/client.js";

interface NSFWSchema {
    nsfw: boolean;
}
interface MalwareSchema {
    safe: boolean;
}

export async function testNSFW(link: string): Promise<NSFWSchema> {
    const p = await saveAttachment(link);
    const data = new FormData();
    console.log(link);
    data.append("file", createReadStream(p));
    const result = await fetch("https://unscan.p.rapidapi.com/", {
        method: "POST",
        headers: {
            "X-RapidAPI-Key": client.config.rapidApiKey,
            "X-RapidAPI-Host": "unscan.p.rapidapi.com"
        },
        body: data
    })
        .then((response) => response.json() as Promise<NSFWSchema>)
        .catch((err) => {
            console.error(err);
            return { nsfw: false };
        });
    console.log(result);
    return { nsfw: result.nsfw };
}

export async function testMalware(link: string): Promise<MalwareSchema> {
    const p = await saveAttachment(link);
    const data = new FormData();
    data.append("file", createReadStream(p));
    console.log(link);
    const result = await fetch("https://unscan.p.rapidapi.com/malware", {
        method: "POST",
        headers: {
            "X-RapidAPI-Key": client.config.rapidApiKey,
            "X-RapidAPI-Host": "unscan.p.rapidapi.com"
        },
        body: data
    })
        .then((response) => response.json() as Promise<MalwareSchema>)
        .catch((err) => {
            console.error(err);
            return { safe: true };
        });
    console.log(result);
    return { safe: result.safe };
}

export async function testLink(link: string): Promise<{ safe: boolean; tags: string[] }> {
    console.log(link);
    const scanned: { safe?: boolean; tags?: string[] } = await fetch("https://unscan.p.rapidapi.com/malware", {
        method: "POST",
        headers: {
            "X-RapidAPI-Key": client.config.rapidApiKey,
            "X-RapidAPI-Host": "unscan.p.rapidapi.com"
        },
        body: `{"link":"${link}"}`
    })
        .then((response) => response.json() as Promise<MalwareSchema>)
        .catch((err) => {
            console.error(err);
            return { safe: true, tags: [] };
        });
    console.log(scanned);
    return {
        safe: scanned.safe ?? true,
        tags: scanned.tags ?? []
    };
}

export async function saveAttachment(link: string): Promise<string> {
    const image = (await (await fetch(link)).buffer()).toString("base64");
    const fileName = generateFileName(link.split("/").pop()!.split(".").pop()!);
    writeFileSync(fileName, image, "base64");
    return fileName;
}

const linkTypes = {
    PHISHING: "Links designed to trick users into clicking on them.",
    DATING: "Dating sites.",
    TRACKERS: "Websites that store or track personal information.",
    ADVERTISEMENTS: "Websites only for ads.",
    FACEBOOK: "Facebook pages. (Facebook has a number of dangerous trackers. Read more on /privacy)",
    AMP: "AMP pages. (AMP is a technology that allows websites to be served by Google. Read more on /privacy)",
    "FACEBOOK TRACKERS": "Websites that include trackers from Facebook.",
    "IP GRABBERS": "Websites that store your IP address, which shows your approximate location.",
    PORN: "Websites that include pornography.",
    GAMBLING: "Gambling sites, often scams.",
    MALWARE: "Websites which download files designed to break or slow down your device.",
    PIRACY: "Sites which include illegally downloaded material.",
    RANSOMWARE: "Websites which download a program that can steal your data and make you pay to get it back.",
    REDIRECTS: "Sites like bit.ly which could redirect to a malicious site.",
    SCAMS: "Sites which are designed to trick you into doing something.",
    TORRENT: "Websites that download torrent files.",
    HATE: "Websites that spread hate towards groups or individuals.",
    JUNK: "Websites that are designed to make you waste time."
};
export { linkTypes };

export async function LinkCheck(message: Discord.Message): Promise<string[]> {
    const links =
        message.content.match(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi
        ) ?? [];
    const detections: { tags: string[]; safe: boolean }[] = [];
    const promises: Promise<void>[] = links.map(async (element) => {
        let returned;
        try {
            if (element.match(/https?:\/\/[a-zA-Z]+\.?discord(app)?\.(com|net)\/?/)) return; // Also matches discord.net, not enough of a bug
            returned = await testLink(element);
        } catch {
            detections.push({ tags: [], safe: true });
            return;
        }
        detections.push({ tags: returned.tags, safe: returned.safe });
    });
    await Promise.all(promises);
    const detectionsTypes = detections
        .map((element) => {
            const type = Object.keys(linkTypes).find((type) => element.tags.includes(type));
            if (type) return type;
            // if (!element.safe) return "UNSAFE"
            return undefined;
        })
        .filter((element) => element !== undefined);
    return detectionsTypes as string[];
}

export async function NSFWCheck(element: string): Promise<boolean> {
    try {
        const test = await testNSFW(element);
        return test.nsfw;
    } catch {
        return false;
    }
}

export async function SizeCheck(element: { height: number | null; width: number | null }): Promise<boolean> {
    if (element.height === null || element.width === null) return true;
    if (element.height < 20 || element.width < 20) return false;
    return true;
}

export async function MalwareCheck(element: string): Promise<boolean> {
    try {
        return (await testMalware(element)).safe;
    } catch {
        return true;
    }
}

export function TestString(string: string, soft: string[], strict: string[]): object | null {
    for (const word of strict) {
        if (string.toLowerCase().includes(word)) {
            return { word: word, type: "strict" };
        }
    }
    for (const word of soft) {
        for (const word2 of string.match(/[a-z]+/gi) ?? []) {
            if (word2 === word) {
                return { word: word, type: "strict" };
            }
        }
    }
    return null;
}

export async function TestImage(url: string): Promise<string | null> {
    const text = await Tesseract.recognize(url, {
        lang: "eng",
        oem: 1,
        psm: 3
    });
    return text;
}
