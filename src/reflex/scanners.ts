import fetch from "node-fetch";
import { writeFileSync } from "fs";
import generateFileName from "../utils/temp/generateFileName.js";
import Tesseract from "node-tesseract-ocr";
import type Discord from "discord.js";
import client from "../utils/client.js";
import { createHash } from "crypto";
import * as nsfwjs from "@clicks/nsfwjs";
import ClamScan from "clamscan";
import * as tf from "@tensorflow/tfjs-node";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import config from "../config/main.js";
import gm from "gm";

interface NSFWSchema {
    nsfw: boolean;
    errored?: boolean;
}
interface MalwareSchema {
    malware: boolean;
    errored?: boolean;
}

const nsfw_model = await nsfwjs.load("file://dist/reflex/nsfwjs/example/nsfw_demo/public/model/", { size: 299 });
const clamscanner = await new ClamScan().init({
    clamdscan: {
        socket: "socket" in config.clamav ? (config.clamav.socket as string) : false,
        host: "host" in config.clamav ? (config.clamav.host as string) : false,
        port: "port" in config.clamav ? (config.clamav.port as number) : false
    }
});

export async function testNSFW(url: string): Promise<NSFWSchema> {
    const [fileStream, hash] = await streamAttachment(url);
    const alreadyHaveCheck = await client.database.scanCache.read(hash);
    if (alreadyHaveCheck && "nsfw" in alreadyHaveCheck!) {
        return { nsfw: alreadyHaveCheck.nsfw };
    }

    const converted = (await new Promise((resolve, reject) =>
        gm(fileStream)
            .command("convert")
            .toBuffer("PNG", (err, buf) => {
                if (err) return reject(err);
                resolve(buf);
            })
    )) as Buffer;

    const img = tf.node.decodeImage(converted, 3, undefined, false) as tf.Tensor3D;

    const predictions = (await nsfw_model.classify(img, 1))[0]!;
    img.dispose();

    const nsfw = predictions.className === "Hentai" || predictions.className === "Porn";
    await client.database.scanCache.write(hash, "nsfw", nsfw);

    return { nsfw };
}

export async function testMalware(link: string): Promise<MalwareSchema> {
    const [fileName, hash] = await saveAttachment(link);
    const alreadyHaveCheck = await client.database.scanCache.read(hash);
    if (alreadyHaveCheck?.malware !== undefined) return { malware: alreadyHaveCheck.malware };
    let malware;
    try {
        malware = (await clamscanner.scanFile(fileName)).isInfected;
    } catch (e) {
        return { malware: false };
    }
    await client.database.scanCache.write(hash, "malware", malware);
    return { malware };
}

export async function testLink(link: string): Promise<{ safe: boolean; tags: string[] }> {
    const alreadyHaveCheck = await client.database.scanCache.read(link);
    if (alreadyHaveCheck?.bad_link !== undefined)
        return { safe: alreadyHaveCheck.bad_link, tags: alreadyHaveCheck.tags ?? [] };
    return { safe: true, tags: [] };
    // const scanned: { safe?: boolean; tags?: string[] } = {}
    // await client.database.scanCache.write(link, "bad_link", scanned.safe ?? true, scanned.tags ?? []);
    // return {
    //     safe: scanned.safe ?? true,
    //     tags: scanned.tags ?? []
    // };
}

export async function streamAttachment(link: string): Promise<[Buffer, string]> {
    const image = await (await fetch(link)).arrayBuffer();
    const enc = new TextDecoder("utf-8");
    const buf = Buffer.from(image);
    return [buf, createHash("sha512").update(enc.decode(image), "base64").digest("base64")];
}

export async function saveAttachment(link: string): Promise<[string, string]> {
    const image = await (await fetch(link)).arrayBuffer();
    const fileName = await generateFileName(link.split("/").pop()!.split(".").pop()!);
    const enc = new TextDecoder("utf-8");
    writeFileSync(fileName, new DataView(image));
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

export async function NSFWCheck(url: string): Promise<boolean> {
    try {
        return (await testNSFW(url)).nsfw;
    } catch (e) {
        console.log(e);
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
        return (await testMalware(element)).malware;
    } catch {
        return true;
    }
}

export function TestString(
    string: string,
    soft: string[],
    strict: string[],
    enabled: boolean = true
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
    try {
        const text = await Tesseract.recognize(url, {
            lang: "eng",
            oem: 1,
            psm: 3
        });
        return text;
    } catch {
        return null;
    }
}

export async function doMemberChecks(member: Discord.GuildMember): Promise<void> {
    if (member.user.bot) return;
    const guild = member.guild;
    const guildData = await client.database.guilds.read(guild.id);
    if (!guildData.logging.staff.channel) return;
    const [loose, strict] = [guildData.filters.wordFilter.words.loose, guildData.filters.wordFilter.words.strict];
    // Does the username contain filtered words
    // Does the nickname contain filtered words
    let nameCheck;
    if (member.nickname) {
        nameCheck = TestString(member.nickname, loose, strict, guildData.filters.wordFilter.enabled);
    } else {
        nameCheck = TestString(member.user.username, loose, strict, guildData.filters.wordFilter.enabled);
    }
    // Does the profile picture contain filtered words
    const avatarTextCheck = TestString(
        (await TestImage(member.displayAvatarURL({ forceStatic: true }))) ?? "",
        loose,
        strict,
        guildData.filters.wordFilter.enabled
    );
    // Is the profile picture NSFW
    const avatar = member.displayAvatarURL({ extension: "png", size: 1024, forceStatic: true });
    const avatarCheck = guildData.filters.images.NSFW && (await NSFWCheck(avatar));
    // Does the username contain an invite
    const inviteCheck = guildData.filters.invite.enabled && /discord\.gg\/[a-zA-Z0-9]+/gi.test(member.user.username);
    // Does the nickname contain an invite
    const nicknameInviteCheck =
        guildData.filters.invite.enabled && /discord\.gg\/[a-zA-Z0-9]+/gi.test(member.nickname ?? "");
    if (nameCheck !== null || avatarCheck || inviteCheck || nicknameInviteCheck || avatarTextCheck !== null) {
        const infractions = [];
        if (nameCheck !== null) {
            infractions.push(`Name contains a ${nameCheck.type}ly filtered word (${nameCheck.word})`);
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
                `Profile picture contains a ${avatarTextCheck.type}ly filtered word (${avatarTextCheck.word})`
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
        const buttons = [
            new ButtonBuilder()
                .setCustomId(`mod:warn:${member.user.id}`)
                .setLabel("Warn")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`mod:mute:${member.user.id}`)
                .setLabel("Mute")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`mod:kick:${member.user.id}`).setLabel("Kick").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`mod:ban:${member.user.id}`).setLabel("Ban").setStyle(ButtonStyle.Danger)
        ];
        if (nameCheck !== null) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`mod:nickname:${member.user.id}`)
                    .setLabel("Change Name")
                    .setStyle(ButtonStyle.Primary)
            );
        }
        if (avatarCheck || avatarTextCheck !== null) {
            buttons.push(
                new ButtonBuilder().setURL(member.displayAvatarURL()).setLabel("View Avatar").setStyle(ButtonStyle.Link)
            );
        }
        const components: ActionRowBuilder<ButtonBuilder>[] = [];

        for (let i = 0; i < buttons.length; i += 5) {
            components.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.slice(i, Math.min(buttons.length - 1, i + 5))
                )
            );
        }

        await channel.send({
            embeds: [embed],
            components: components
        });
    }
}
