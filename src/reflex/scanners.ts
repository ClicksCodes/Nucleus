import fetch from "node-fetch";
import { writeFileSync } from "fs";
import generateFileName from "../utils/temp/generateFileName.js";
import Tesseract from "node-tesseract-ocr";
import type Discord from "discord.js";
import client from "../utils/client.js";
import { createHash } from "crypto";
import * as nsfwjs from "nsfwjs";
// import * as clamscan from "clamscan";
import * as tf from "@tensorflow/tfjs";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

interface NSFWSchema {
    nsfw: boolean;
    errored?: boolean;
}
interface MalwareSchema {
    safe: boolean;
    errored?: boolean;
}

const nsfw_model = await nsfwjs.load();

export async function testNSFW(link: string): Promise<NSFWSchema> {
    const [fileStream, hash] = await streamAttachment(link);
    const alreadyHaveCheck = await client.database.scanCache.read(hash);
    if (alreadyHaveCheck?.nsfw) return { nsfw: alreadyHaveCheck.nsfw };

    const image = tf.tensor3d(new Uint8Array(fileStream));

    const predictions = (await nsfw_model.classify(image, 1))[0]!;
    image.dispose();

    return { nsfw: predictions.className === "Hentai" || predictions.className === "Porn" };
}

export async function testMalware(link: string): Promise<MalwareSchema> {
    const [_, hash] = await saveAttachment(link);
    const alreadyHaveCheck = await client.database.scanCache.read(hash);
    if (alreadyHaveCheck?.malware) return { safe: alreadyHaveCheck.malware };
    return { safe: true };
    // const data = new URLSearchParams();
    // // const f = createReadStream(p);
    // data.append("file", f.read(fs.statSync(p).size));
    // const result = await fetch("https://unscan.p.rapidapi.com/malware", {
    //     method: "POST",
    //     headers: {
    //         "X-RapidAPI-Key": client.config.rapidApiKey,
    //         "X-RapidAPI-Host": "unscan.p.rapidapi.com"
    //     },
    //     body: data
    // })
    //     .then((response) =>
    //         response.status === 200 ? (response.json() as Promise<MalwareSchema>) : { safe: true, errored: true }
    //     )
    //     .catch((err) => {
    //         console.error(err);
    //         return { safe: true, errored: true };
    //     });
    // if (!result.errored) {
    //     client.database.scanCache.write(hash, "malware", result.safe);
    // }
    // return { safe: result.safe };
}

export async function testLink(link: string): Promise<{ safe: boolean; tags: string[] }> {
    const alreadyHaveCheck = await client.database.scanCache.read(link);
    if (alreadyHaveCheck?.bad_link) return { safe: alreadyHaveCheck.bad_link, tags: alreadyHaveCheck.tags };
    const scanned: { safe?: boolean; tags?: string[] } = await fetch("https://unscan.p.rapidapi.com/link", {
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
    client.database.scanCache.write(link, "bad_link", scanned.safe ?? true, scanned.tags ?? []);
    return {
        safe: scanned.safe ?? true,
        tags: scanned.tags ?? []
    };
}

export async function streamAttachment(link: string): Promise<[ArrayBuffer, string]> {
    const image = await (await fetch(link)).arrayBuffer();
    const enc = new TextDecoder("utf-8");
    return [image, createHash("sha512").update(enc.decode(image), "base64").digest("base64")];
}

export async function saveAttachment(link: string): Promise<[string, string]> {
    const image = await (await fetch(link)).arrayBuffer();
    const fileName = generateFileName(link.split("/").pop()!.split(".").pop()!);
    const enc = new TextDecoder("utf-8");
    writeFileSync(fileName, new DataView(image), "base64");
    return [fileName, createHash("sha512").update(enc.decode(image), "base64").digest("base64")];
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
        return (await testNSFW(element)).nsfw;
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

export function TestString(
    string: string,
    soft: string[],
    strict: string[],
    enabled?: boolean
): { word: string; type: string } | null {
    if (!enabled) return null;
    for (const word of strict) {
        if (string.toLowerCase().includes(word)) {
            return { word: word, type: "strict" };
        }
    }
    for (const word of soft) {
        for (const word2 of string.match(/[a-z]+/gi) ?? []) {
            if (word2 === word) {
                return { word: word, type: "soft" };
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

export async function doMemberChecks(member: Discord.GuildMember, guild: Discord.Guild): Promise<void> {
    if (member.user.bot) return;
    const guildData = await client.database.guilds.read(guild.id);
    if (!guildData.logging.staff.channel) return;
    const [loose, strict] = [guildData.filters.wordFilter.words.loose, guildData.filters.wordFilter.words.strict];
    // Does the username contain filtered words
    const usernameCheck = TestString(member.user.username, loose, strict, guildData.filters.wordFilter.enabled);
    // Does the nickname contain filtered words
    const nicknameCheck = TestString(member.nickname ?? "", loose, strict, guildData.filters.wordFilter.enabled);
    // Does the profile picture contain filtered words
    const avatarTextCheck = TestString(
        (await TestImage(member.user.displayAvatarURL({ forceStatic: true }))) ?? "",
        loose,
        strict,
        guildData.filters.wordFilter.enabled
    );
    // Is the profile picture NSFW
    const avatarCheck =
        guildData.filters.images.NSFW && (await NSFWCheck(member.user.displayAvatarURL({ forceStatic: true })));
    // Does the username contain an invite
    const inviteCheck = guildData.filters.invite.enabled && /discord\.gg\/[a-zA-Z0-9]+/gi.test(member.user.username);
    // Does the nickname contain an invite
    const nicknameInviteCheck =
        guildData.filters.invite.enabled && /discord\.gg\/[a-zA-Z0-9]+/gi.test(member.nickname ?? "");

    if (
        usernameCheck !== null ||
        nicknameCheck !== null ||
        avatarCheck ||
        inviteCheck ||
        nicknameInviteCheck ||
        avatarTextCheck !== null
    ) {
        const infractions = [];
        if (usernameCheck !== null) {
            infractions.push(`Username contains a ${usernameCheck.type}ly filtered word (${usernameCheck.word})`);
        }
        if (nicknameCheck !== null) {
            infractions.push(`Nickname contains a ${nicknameCheck.type}ly filtered word (${nicknameCheck.word})`);
        }
        if (avatarCheck) {
            infractions.push("Profile picture is NSFW");
        }
        if (inviteCheck) {
            infractions.push("Username contains an invite");
        }
        if (nicknameInviteCheck) {
            infractions.push("Nickname contains an invite");
        }
        if (avatarTextCheck !== null) {
            infractions.push(
                `Profile picture contains a ${avatarTextCheck.type}ly filtered word: ${avatarTextCheck.word}`
            );
        }
        if (infractions.length === 0) return;
        // This is bad - Warn in the staff notifications channel
        const filter = getEmojiByName("ICONS.FILTER");
        const channel = guild.channels.cache.get(guildData.logging.staff.channel) as Discord.TextChannel;
        const embed = new EmojiEmbed()
            .setTitle("Member Flagged")
            .setEmoji("ICONS.FLAGS.RED")
            .setStatus("Danger")
            .setDescription(
                `**Member:** ${member.user.username} (<@${member.user.id}>)\n\n` +
                    infractions.map((element) => `${filter} ${element}`).join("\n")
            );
        await channel.send({
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ...[
                        new ButtonBuilder()
                            .setCustomId(`mod:warn:${member.user.id}`)
                            .setLabel("Warn")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`mod:mute:${member.user.id}`)
                            .setLabel("Mute")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`mod:kick:${member.user.id}`)
                            .setLabel("Kick")
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`mod:ban:${member.user.id}`)
                            .setLabel("Ban")
                            .setStyle(ButtonStyle.Danger)
                    ].concat(
                        usernameCheck !== null || nicknameCheck !== null || avatarTextCheck !== null
                            ? [
                                  new ButtonBuilder()
                                      .setCustomId(`mod:nickname:${member.user.id}`)
                                      .setLabel("Change Name")
                                      .setStyle(ButtonStyle.Primary)
                              ]
                            : []
                    )
                )
            ]
        });
    }
}
