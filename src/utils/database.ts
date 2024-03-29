import {
    ButtonStyle,
    CommandInteraction,
    ComponentType,
    GuildMember,
    Message,
    MessageComponentInteraction
} from "discord.js";
import type Discord from "discord.js";
import { Collection, MongoClient } from "mongodb";
import config from "../config/main.js";
import client from "../utils/client.js";
import * as crypto from "crypto";
import _ from "lodash";
import defaultData from "../config/default.js";

let username, password;

if ("username" in config.mongoOptions) username = encodeURIComponent(config.mongoOptions.username as string);
if ("password" in config.mongoOptions) password = encodeURIComponent(config.mongoOptions.password as string);

const mongoClient = new MongoClient(
    username
        ? `mongodb://${username}:${password}@${config.mongoOptions.host}/${config.mongoOptions.database}` +
          `?authMechanism=DEFAULT&authSource=${config.mongoOptions.authSource}`
        : `mongodb://${config.mongoOptions.host}`
);
await mongoClient.connect();
export const database = mongoClient.db();

const collectionOptions = { authdb: config.mongoOptions.authSource, w: "majority" };
const getIV = () => crypto.randomBytes(16);

export class Guilds {
    guilds: Collection<GuildConfig>;
    oldGuilds: Collection<GuildConfig>;
    defaultData: GuildConfig;

    constructor() {
        this.guilds = database.collection<GuildConfig>("guilds");
        this.defaultData = defaultData;
        this.oldGuilds = database.collection<GuildConfig>("oldGuilds");
    }

    async readOld(guild: string): Promise<Partial<GuildConfig>> {
        // console.log("Guild read")
        const entry = await this.oldGuilds.findOne({ id: guild });
        return entry ?? {};
    }

    async updateAllGuilds() {
        const guilds = await this.guilds.find().toArray();
        for (const guild of guilds) {
            let guildObj;
            try {
                guildObj = await client.guilds.fetch(guild.id);
            } catch (e) {
                guildObj = null;
            }
            if (!guildObj) await this.delete(guild.id);
        }
    }

    async read(guild: string): Promise<GuildConfig> {
        // console.log("Guild read")
        const entry = await this.guilds.findOne({ id: guild });
        const data = _.cloneDeep(this.defaultData);
        return _.merge(data, entry ?? {});
    }

    async write(guild: string, set: object | null, unset: string[] | string = []) {
        // console.log("Guild write")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uo: Record<string, any> = {};
        if (!Array.isArray(unset)) unset = [unset];
        for (const key of unset) {
            uo[key] = null;
        }
        const out = { $set: {}, $unset: {} };
        if (set) out.$set = set;
        if (unset.length) out.$unset = uo;
        await this.guilds.updateOne({ id: guild }, out, { upsert: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async append(guild: string, key: string, value: any) {
        // console.log("Guild append")
        if (Array.isArray(value)) {
            await this.guilds.updateOne(
                { id: guild },
                {
                    $addToSet: { [key]: { $each: value } }
                },
                { upsert: true }
            );
        } else {
            await this.guilds.updateOne(
                { id: guild },
                {
                    $addToSet: { [key]: value }
                },
                { upsert: true }
            );
        }
    }

    async remove(
        guild: string,
        key: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        innerKey?: string | null
    ) {
        // console.log("Guild remove")
        if (innerKey) {
            await this.guilds.updateOne(
                { id: guild },
                {
                    $pull: { [key]: { [innerKey]: { $eq: value } } }
                },
                { upsert: true }
            );
        } else if (Array.isArray(value)) {
            await this.guilds.updateOne(
                { id: guild },
                {
                    $pullAll: { [key]: value }
                },
                { upsert: true }
            );
        } else {
            await this.guilds.updateOne(
                { id: guild },
                {
                    $pullAll: { [key]: [value] }
                },
                { upsert: true }
            );
        }
    }

    async delete(guild: string) {
        // console.log("Guild delete")
        await this.guilds.deleteOne({ id: guild });
    }

    async staffChannels(): Promise<string[]> {
        const entries = (
            await this.guilds
                .find(
                    { "logging.staff.channel": { $exists: true } },
                    { projection: { "logging.staff.channel": 1, _id: 0 } }
                )
                .toArray()
        ).map((e) => e.logging.staff.channel);
        const out: string[] = [];
        for (const entry of entries) {
            if (entry) out.push(entry);
        }
        return out;
    }
}

interface TranscriptEmbed {
    title?: string;
    description?: string;
    fields?: {
        name: string;
        value: string;
        inline: boolean;
    }[];
    footer?: {
        text: string;
        iconURL?: string;
    };
    color?: number;
    timestamp?: string;
    author?: {
        name: string;
        iconURL?: string;
        url?: string;
    };
}

interface TranscriptComponent {
    type: number;
    style?: ButtonStyle;
    label?: string;
    description?: string;
    placeholder?: string;
    emojiURL?: string;
}

interface TranscriptAuthor {
    username: string;
    discriminator: string | undefined;
    nickname?: string;
    id: string;
    iconURL?: string;
    topRole: {
        color: number;
        badgeURL?: string;
    };
    bot: boolean;
}

interface TranscriptAttachment {
    url: string;
    filename: string;
    size: number;
    log?: string;
}

interface TranscriptMessage {
    id: string;
    author: TranscriptAuthor;
    content?: string;
    embeds?: TranscriptEmbed[];
    components?: TranscriptComponent[][];
    editedTimestamp?: number;
    createdTimestamp: number;
    flags?: string[];
    attachments?: TranscriptAttachment[];
    stickerURLs?: string[];
    referencedMessage?: string | [string, string, string]; // the message id, the channel id, the guild id
}

interface TranscriptSchema {
    code: string;
    for: TranscriptAuthor;
    type: "ticket" | "purge";
    guild: string;
    channel: string;
    messages: TranscriptMessage[];
    createdTimestamp: number;
    createdBy: TranscriptAuthor;
}

interface findDocSchema {
    channelID: string;
    messageID: string;
    code: string;
}

export class Transcript {
    transcripts: Collection<TranscriptSchema>;
    messageToTranscript: Collection<findDocSchema>;

    constructor() {
        this.transcripts = database.collection<TranscriptSchema>("transcripts");
        this.messageToTranscript = database.collection<findDocSchema>("messageToTranscript");
    }

    async upload(data: findDocSchema) {
        // console.log("Transcript upload")
        await this.messageToTranscript.insertOne(data);
    }

    async create(transcript: Omit<TranscriptSchema, "code">) {
        // console.log("Transcript create")
        let code;
        do {
            code = crypto.randomBytes(64).toString("base64").replace(/=/g, "").replace(/\//g, "_").replace(/\+/g, "-");
        } while (await this.transcripts.findOne({ code: code }));
        const key = crypto
            .randomBytes(32 ** 2)
            .toString("base64")
            .replace(/=/g, "")
            .replace(/\//g, "_")
            .replace(/\+/g, "-")
            .substring(0, 32);
        const iv = getIV()
            .toString("base64")
            .substring(0, 16)
            .replace(/=/g, "")
            .replace(/\//g, "_")
            .replace(/\+/g, "-");
        for (const message of transcript.messages) {
            if (message.content) {
                const encCipher = crypto.createCipheriv("AES-256-CBC", key, iv);
                message.content = encCipher.update(message.content, "utf8", "base64") + encCipher.final("base64");
            }
        }

        const doc = await this.transcripts.insertOne(Object.assign(transcript, { code: code }), collectionOptions);
        if (doc.acknowledged) {
            await client.database.eventScheduler.schedule(
                "deleteTranscript",
                (Date.now() + 1000 * 60 * 60 * 24 * 7).toString(),
                { guild: transcript.guild, code: code, iv: iv, key: key }
            );
            return [code, key, iv];
        } else return [null, null, null];
    }

    async delete(code: string) {
        // console.log("Transcript delete")
        await this.transcripts.deleteOne({ code: code });
    }

    async deleteAll(guild: string) {
        // console.log("Transcript delete")
        const filteredDocs = await this.transcripts.find({ guild: guild }).toArray();
        for (const doc of filteredDocs) {
            await this.transcripts.deleteOne({ code: doc.code });
        }
    }

    async readEncrypted(code: string) {
        // console.log("Transcript read")
        let doc: TranscriptSchema | null = await this.transcripts.findOne({ code: code });
        let findDoc: findDocSchema | null = null;
        if (!doc) findDoc = await this.messageToTranscript.findOne({ transcript: code });
        if (findDoc) {
            const message = await (
                client.channels.cache.get(findDoc.channelID) as Discord.TextBasedChannel | null
            )?.messages.fetch(findDoc.messageID);
            if (!message) return null;
            const attachment = message.attachments.first();
            if (!attachment) return null;
            const transcript = (await fetch(attachment.url)).body;
            if (!transcript) return null;
            const reader = transcript.getReader();
            let data: Uint8Array | null = null;
            let allPacketsReceived = false;
            while (!allPacketsReceived) {
                const { value, done } = await reader.read();
                if (done) {
                    allPacketsReceived = true;
                    continue;
                }
                if (!data) {
                    data = value;
                } else {
                    data = new Uint8Array(Buffer.concat([data, value]));
                }
            }
            if (!data) return null;
            doc = JSON.parse(Buffer.from(data).toString()) as TranscriptSchema;
        }
        if (!doc) return null;
        return doc;
    }

    async read(code: string, key: string, iv: string) {
        let doc: TranscriptSchema | null = await this.transcripts.findOne({ code: code });
        let findDoc: findDocSchema | null = null;
        if (!doc) findDoc = await this.messageToTranscript.findOne({ transcript: code });
        if (findDoc) {
            const message = await (
                client.channels.cache.get(findDoc.channelID) as Discord.TextBasedChannel | null
            )?.messages.fetch(findDoc.messageID);
            if (!message) return null;
            const attachment = message.attachments.first();
            if (!attachment) return null;
            const transcript = (await fetch(attachment.url)).body;
            if (!transcript) return null;
            const reader = transcript.getReader();
            let data: Uint8Array | null = null;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (!data) {
                    data = value;
                } else {
                    data = new Uint8Array(Buffer.concat([data, value]));
                }
            }
            if (!data) return null;
            doc = JSON.parse(Buffer.from(data).toString()) as TranscriptSchema;
        }
        if (!doc) return null;
        for (const message of doc.messages) {
            if (message.content) {
                const decCipher = crypto.createDecipheriv("AES-256-CBC", key, iv);
                message.content = decCipher.update(message.content, "base64", "utf8") + decCipher.final("utf8");
            }
        }
        return doc;
    }

    async createTranscript(
        type: "ticket" | "purge",
        messages: Message[],
        interaction: MessageComponentInteraction | CommandInteraction,
        member: GuildMember
    ) {
        const interactionMember = await interaction.guild?.members.fetch(interaction.user.id);
        const newOut: Omit<TranscriptSchema, "code"> = {
            type: type,
            for: {
                username: member!.user.username,
                discriminator: member!.user.discriminator === "0" ? undefined : member!.user.discriminator,
                id: member!.user.id,
                topRole: {
                    color: member!.roles.highest.color
                },
                iconURL: member!.user.displayAvatarURL({ forceStatic: true }),
                bot: member!.user.bot
            },
            guild: interaction.guild!.id,
            channel: interaction.channel!.id,
            messages: [],
            createdTimestamp: Date.now(),
            createdBy: {
                username: interaction.user.username,
                discriminator: interaction.user.discriminator === "0" ? undefined : interaction.user.discriminator,
                id: interaction.user.id,
                topRole: {
                    color: interactionMember?.roles.highest.color ?? 0x000000
                },
                iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
                bot: interaction.user.bot
            }
        };
        if (member.nickname) newOut.for.nickname = member.nickname;
        if (interactionMember?.roles.icon) newOut.createdBy.topRole.badgeURL = interactionMember.roles.icon.iconURL()!;
        messages.reverse().forEach((message) => {
            const msg: TranscriptMessage = {
                id: message.id,
                author: {
                    username: message.author.username,
                    discriminator: message.author.discriminator === "0" ? undefined : message.author.discriminator,
                    id: message.author.id,
                    topRole: {
                        color: message.member ? message.member.roles.highest.color : 0x000000
                    },
                    iconURL: (message.member?.user ?? message.author).displayAvatarURL({ forceStatic: true }),
                    bot: message.author.bot || false
                },
                createdTimestamp: message.createdTimestamp
            };
            if (message.member?.nickname) msg.author.nickname = message.member.nickname;
            if (message.member?.roles.icon) msg.author.topRole.badgeURL = message.member!.roles.icon.iconURL()!;
            if (message.content) msg.content = message.content;
            if (message.embeds.length > 0)
                msg.embeds = message.embeds.map((embed) => {
                    const obj: TranscriptEmbed = {};
                    if (embed.title) obj.title = embed.title;
                    if (embed.description) obj.description = embed.description;
                    if (embed.fields.length > 0)
                        obj.fields = embed.fields.map((field) => {
                            return {
                                name: field.name,
                                value: field.value,
                                inline: field.inline ?? false
                            };
                        });
                    if (embed.color) obj.color = embed.color;
                    if (embed.timestamp) obj.timestamp = embed.timestamp;
                    if (embed.footer)
                        obj.footer = {
                            text: embed.footer.text
                        };
                    if (embed.footer?.iconURL) obj.footer!.iconURL = embed.footer.iconURL;
                    if (embed.author)
                        obj.author = {
                            name: embed.author.name
                        };
                    if (embed.author?.iconURL) obj.author!.iconURL = embed.author.iconURL;
                    if (embed.author?.url) obj.author!.url = embed.author.url;
                    return obj;
                });
            if (message.components.length > 0)
                msg.components = message.components.map((component) =>
                    component.components.map((child) => {
                        const obj: TranscriptComponent = {
                            type: child.type
                        };
                        if (child.type === ComponentType.Button) {
                            obj.style = child.style;
                            obj.label = child.label ?? "";
                        } else if (
                            child.type === ComponentType.StringSelect ||
                            child.type === ComponentType.UserSelect ||
                            child.type === ComponentType.ChannelSelect ||
                            child.type === ComponentType.RoleSelect
                        ) {
                            obj.placeholder = child.placeholder ?? "";
                        }
                        return obj;
                    })
                );
            if (message.editedTimestamp) msg.editedTimestamp = message.editedTimestamp;
            msg.flags = message.flags.toArray();

            if (message.stickers.size > 0) msg.stickerURLs = message.stickers.map((sticker) => sticker.url);
            if (message.reference)
                msg.referencedMessage = [
                    message.reference.guildId ?? "",
                    message.reference.channelId,
                    message.reference.messageId ?? ""
                ];
            newOut.messages.push(msg);
        });
        return newOut;
    }

    toHumanReadable(transcript: Omit<TranscriptSchema, "code">): string {
        let out = "";
        for (const message of transcript.messages) {
            if (message.referencedMessage) {
                if (Array.isArray(message.referencedMessage)) {
                    out += `> [Crosspost From] ${message.referencedMessage[0]} in ${message.referencedMessage[1]} in ${message.referencedMessage[2]}\n`;
                } else out += `> [Reply To] ${message.referencedMessage}\n`;
            }
            out += `${message.author.nickname ?? message.author.username} (${message.author.id}) (${message.id})`;
            out += ` [${new Date(message.createdTimestamp).toISOString()}]`;
            if (message.editedTimestamp) out += ` [Edited: ${new Date(message.editedTimestamp).toISOString()}]`;
            out += "\n";
            if (message.content) out += `[Content]\n${message.content}\n\n`;
            if (message.embeds) {
                for (const embed of message.embeds) {
                    out += `[Embed]\n`;
                    if (embed.title) out += `| Title: ${embed.title}\n`;
                    if (embed.description) out += `| Description: ${embed.description}\n`;
                    if (embed.fields) {
                        for (const field of embed.fields) {
                            out += `| Field: ${field.name} - ${field.value}\n`;
                        }
                    }
                    if (embed.footer) {
                        out += `|Footer: ${embed.footer.text}\n`;
                    }
                    out += "\n";
                }
            }
            if (message.components) {
                for (const component of message.components) {
                    out += `[Component]\n`;
                    for (const button of component) {
                        out += `| Button: ${button.label ?? button.description}\n`;
                    }
                    out += "\n";
                }
            }
            if (message.attachments) {
                for (const attachment of message.attachments) {
                    out += `[Attachment] ${attachment.filename} (${attachment.size} bytes) ${attachment.url}\n`;
                }
            }
            out += "\n\n";
        }
        return out;
    }
}

export class History {
    histories: Collection<HistorySchema>;

    constructor() {
        this.histories = database.collection<HistorySchema>("history");
    }

    async create(
        type: string,
        guild: string,
        user: Discord.User,
        moderator: Discord.User | null,
        reason: string | null,
        before?: string | null,
        after?: string | null,
        amount?: string | null
    ) {
        // console.log("History create");
        await this.histories.insertOne(
            {
                type: type,
                guild: guild,
                user: user.id,
                moderator: moderator ? moderator.id : null,
                reason: reason,
                occurredAt: new Date(),
                before: before ?? null,
                after: after ?? null,
                amount: amount ?? null
            },
            collectionOptions
        );
    }

    async read(guild: string, user: string, year: number) {
        // console.log("History read");
        const entry = (await this.histories
            .find({
                guild: guild,
                user: user,
                occurredAt: {
                    $gte: new Date(year - 1, 11, 31, 23, 59, 59),
                    $lt: new Date(year + 1, 0, 1, 0, 0, 0)
                }
            })
            .toArray()) as HistorySchema[];
        return entry;
    }

    async delete(guild: string) {
        // console.log("History delete");
        await this.histories.deleteMany({ guild: guild });
    }
}

interface ScanCacheSchema {
    addedAt: Date;
    hash: string;
    nsfw?: boolean;
    malware?: boolean;
    bad_link?: boolean;
    tags?: string[];
}

export class ScanCache {
    scanCache: Collection<ScanCacheSchema>;

    constructor() {
        this.scanCache = database.collection<ScanCacheSchema>("scanCache");
    }

    async read(hash: string) {
        return await this.scanCache.findOne({ hash: hash });
    }

    async write(hash: string, type: "nsfw" | "malware" | "bad_link", data: boolean, tags?: string[]) {
        // await this.scanCache.insertOne(
        //     { hash: hash, [type]: data, tags: tags ?? [], addedAt: new Date() },
        //     collectionOptions
        // );
        await this.scanCache.updateOne(
            { hash: hash },
            {
                $set: (() => {
                    switch (type) {
                        case "nsfw": {
                            return { nsfw: data, addedAt: new Date() };
                        }
                        case "malware": {
                            return { malware: data, addedAt: new Date() };
                        }
                        case "bad_link": {
                            return { bad_link: data, tags: tags ?? [], addedAt: new Date() };
                        }
                        default: {
                            throw new Error("Invalid type");
                        }
                    }
                })()
                // No you can't just do { [type]: data }, yes it's a typescript error, no I don't know how to fix it
                // cleanly, yes it would be marginally more elegant, no it's not essential, yes I'd be happy to review
                // PRs that did improve this snippet
                // Made an attempt... Gave up... Just Leave It
                // Counter: 2
            },
            Object.assign({ upsert: true }, collectionOptions)
        );
    }

    async cleanup() {
        // console.log("ScanCache cleanup");
        await this.scanCache.deleteMany({
            addedAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31) },
            hash: { $not$text: "http" }
        });
    }
}

export class PerformanceTest {
    performanceData: Collection<PerformanceDataSchema>;

    constructor() {
        this.performanceData = database.collection<PerformanceDataSchema>("performance");
    }

    async record(data: PerformanceDataSchema) {
        // console.log("PerformanceTest record");
        data.timestamp = new Date();
        await this.performanceData.insertOne(data, collectionOptions);
    }
    async read() {
        // console.log("PerformanceTest read");
        return await this.performanceData.find({}).toArray();
    }
}

export interface PerformanceDataSchema {
    timestamp?: Date;
    discord: number;
    databaseRead: number;
    resources: {
        cpu: number;
        memory: number;
        temperature: number;
    };
}

export class ModNotes {
    modNotes: Collection<ModNoteSchema>;

    constructor() {
        this.modNotes = database.collection<ModNoteSchema>("modNotes");
    }

    async flag(guild: string, user: string, flag: FlagColors | null) {
        const modNote = await this.modNotes.findOne({ guild: guild, user: user });
        modNote
            ? await this.modNotes.updateOne({ guild: guild, user: user }, { $set: { flag: flag } }, collectionOptions)
            : await this.modNotes.insertOne({ guild: guild, user: user, note: null, flag: flag }, collectionOptions);
    }

    async create(guild: string, user: string, note: string | null) {
        // console.log("ModNotes create");
        const modNote = await this.modNotes.findOne({ guild: guild, user: user });
        modNote
            ? await this.modNotes.updateOne({ guild: guild, user: user }, { $set: { note: note } }, collectionOptions)
            : await this.modNotes.insertOne({ guild: guild, user: user, note: note, flag: null }, collectionOptions);
    }

    async read(guild: string, user: string) {
        // console.log("ModNotes read");
        const entry = await this.modNotes.findOne({ guild: guild, user: user });
        return entry ?? null;
    }

    async delete(guild: string) {
        // console.log("ModNotes delete");
        await this.modNotes.deleteMany({ guild: guild });
    }
}

export class Premium {
    premium: Collection<PremiumSchema>;
    cache: Map<string, [boolean, string, number, boolean, Date]>; // Date indicates the time one hour after it was created
    cacheTimeout = 1000 * 60 * 60; // 1 hour

    constructor() {
        this.premium = database.collection<PremiumSchema>("premium");
        this.cache = new Map<string, [boolean, string, number, boolean, Date]>();
    }

    async updateUser(user: string, level: number) {
        // console.log("Premium updateUser");
        if (!(await this.userExists(user))) await this.createUser(user, level);
        await this.premium.updateOne({ user: user }, { $set: { level: level } }, { upsert: true });
    }

    async userExists(user: string): Promise<boolean> {
        // console.log("Premium userExists");
        const entry = await this.premium.findOne({ user: user });
        return entry ? true : false;
    }
    async createUser(user: string, level: number) {
        // console.log("Premium createUser");
        await this.premium.insertOne({ user: user, appliesTo: [], level: level }, collectionOptions);
    }

    async hasPremium(guild: string): Promise<[boolean, string, number, boolean] | null> {
        // console.log("Premium hasPremium");
        // [Has premium, user giving premium, level, is mod: if given automatically]
        const cached = this.cache.get(guild);
        if (cached && cached[4].getTime() < Date.now()) return [cached[0], cached[1], cached[2], cached[3]];
        const entries = await this.premium.find({}).toArray();
        const members = (await client.guilds.fetch(guild)).members.cache;
        for (const { user } of entries) {
            const member = members.get(user);
            if (member) {
                //TODO: Notify user if they've given premium to a server that has since gotten premium via a mod.
                const modPerms = //TODO: Create list in config for perms
                    member.permissions.has("Administrator") ||
                    member.permissions.has("ManageChannels") ||
                    member.permissions.has("ManageRoles") ||
                    member.permissions.has("ManageEmojisAndStickers") ||
                    member.permissions.has("ManageWebhooks") ||
                    member.permissions.has("ManageGuild") ||
                    member.permissions.has("KickMembers") ||
                    member.permissions.has("BanMembers") ||
                    member.permissions.has("ManageEvents") ||
                    member.permissions.has("ManageMessages") ||
                    member.permissions.has("ManageThreads");
                const entry = entries.find((e) => e.user === member.id);
                if (entry && entry.level === 3 && modPerms) {
                    this.cache.set(guild, [
                        true,
                        member.id,
                        entry.level,
                        true,
                        new Date(Date.now() + this.cacheTimeout)
                    ]);
                    return [true, member.id, entry.level, true];
                }
            }
        }
        const entry = await this.premium.findOne({
            appliesTo: {
                $elemMatch: {
                    $eq: guild
                }
            }
        });
        this.cache.set(guild, [
            entry ? true : false,
            entry?.user ?? "",
            entry?.level ?? 0,
            false,
            new Date(Date.now() + this.cacheTimeout)
        ]);
        return entry ? [true, entry.user, entry.level, false] : null;
    }

    async fetchUser(user: string): Promise<PremiumSchema | null> {
        // console.log("Premium fetchUser");
        const entry = await this.premium.findOne({ user: user });
        if (!entry) return null;
        return entry;
    }

    async checkAllPremium(member?: GuildMember) {
        // console.log("Premium checkAllPremium");
        const entries = await this.premium.find({}).toArray();
        if (member) {
            const entry = entries.find((e) => e.user === member.id);
            if (entry) {
                const expiresAt = entry.expiresAt;
                if (expiresAt) expiresAt < Date.now() ? await this.premium.deleteOne({ user: member.id }) : null;
            }
            const roles = member.roles;
            let level = 0;
            if (roles.cache.has("1066468879309750313")) {
                level = 99;
            } else if (roles.cache.has("1066465491713003520")) {
                level = 1;
            } else if (roles.cache.has("1066439526496604194")) {
                level = 2;
            } else if (roles.cache.has("1066464134322978912")) {
                level = 3;
            }
            await this.updateUser(member.id, level);
            if (level > 0) {
                await this.premium.updateOne({ user: member.id }, { $unset: { expiresAt: "" } });
            } else {
                await this.premium.updateOne(
                    { user: member.id },
                    { $set: { expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 3 } }
                );
            }
        } else {
            const members = await (await client.guilds.fetch("684492926528651336")).members.fetch();
            for (const { roles, id } of members.values()) {
                const entry = entries.find((e) => e.user === id);
                if (entry) {
                    const expiresAt = entry.expiresAt;
                    if (expiresAt) expiresAt < Date.now() ? await this.premium.deleteOne({ user: id }) : null;
                }
                let level: number = 0;
                if (roles.cache.has("1066468879309750313")) {
                    level = 99;
                } else if (roles.cache.has("1066465491713003520")) {
                    level = 1;
                } else if (roles.cache.has("1066439526496604194")) {
                    level = 2;
                } else if (roles.cache.has("1066464134322978912")) {
                    level = 3;
                }
                await this.updateUser(id, level);
                if (level > 0) {
                    await this.premium.updateOne({ user: id }, { $unset: { expiresAt: "" } });
                } else {
                    await this.premium.updateOne(
                        { user: id },
                        { $set: { expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 3 } }
                    );
                }
            }
        }
    }

    async addPremium(user: string, guild: string) {
        // console.log("Premium addPremium");
        const { level } = (await this.fetchUser(user))!;
        this.cache.set(guild, [true, user, level, false, new Date(Date.now() + this.cacheTimeout)]);
        return this.premium.updateOne({ user: user }, { $addToSet: { appliesTo: guild } }, { upsert: true });
    }

    async removePremium(user: string, guild: string) {
        // console.log("Premium removePremium");
        this.cache.set(guild, [false, "", 0, false, new Date(Date.now() + this.cacheTimeout)]);
        return await this.premium.updateOne({ user: user }, { $pull: { appliesTo: guild } });
    }
}

// export class Plugins {}

export interface GuildConfig {
    id: string;
    version: number;
    singleEventNotifications: Record<string, boolean>;
    filters: {
        images: {
            NSFW: boolean;
            size: boolean;
        };
        malware: boolean;
        wordFilter: {
            enabled: boolean;
            words: {
                strict: string[];
                loose: string[];
            };
            allowed: {
                users: string[];
                roles: string[];
                channels: string[];
            };
        };
        invite: {
            enabled: boolean;
            allowed: {
                channels: string[];
                roles: string[];
                users: string[];
            };
        };
        pings: {
            mass: number;
            everyone: boolean;
            roles: boolean;
            allowed: {
                roles: string[];
                rolesToMention: string[];
                users: string[];
                channels: string[];
            };
        };
        clean: {
            channels: string[];
            allowed: {
                users: string[];
                roles: string[];
            };
        };
    };
    autoPublish: {
        enabled: boolean;
        channels: string[];
    };
    welcome: {
        enabled: boolean;
        role: string | null;
        ping: string | null;
        channel: string | null;
        message: string | null;
    };
    stats: Record<string, { name: string; enabled: boolean }>;
    logging: {
        logs: {
            enabled: boolean;
            channel: string | null;
            toLog: string;
        };
        staff: {
            channel: string | null;
        };
        attachments: {
            channel: string | null;
            saved: Record<string, string>;
        };
    };
    verify: {
        enabled: boolean;
        role: string | null;
    };
    tickets: {
        enabled: boolean;
        category: string | null;
        types: string;
        customTypes: string[] | null;
        useCustom: boolean;
        supportRole: string | null;
        maxTickets: number;
    };
    moderation: {
        mute: {
            timeout: boolean;
            role: string | null;
            text: string | null;
            link: string | null;
        };
        kick: {
            text: string | null;
            link: string | null;
        };
        ban: {
            text: string | null;
            link: string | null;
        };
        softban: {
            text: string | null;
            link: string | null;
        };
        warn: {
            text: string | null;
            link: string | null;
        };
        role: {
            role: string | null;
            text: null;
            link: null;
        };
        nick: {
            text: string | null;
            link: string | null;
        };
    };
    tracks: {
        name: string;
        retainPrevious: boolean;
        nullable: boolean;
        track: string[];
        manageableBy: string[];
    }[];
    roleMenu: {
        enabled: boolean;
        allowWebUI: boolean;
        options: {
            enabled?: boolean;
            name: string;
            description?: string;
            min: number;
            max: number;
            options: {
                name: string;
                description: string | null;
                role: string;
            }[];
        }[];
    };
    tags: Record<string, string>;
}

export interface HistorySchema {
    type: string;
    guild: string;
    user: string;
    moderator: string | null;
    reason: string | null;
    occurredAt: Date;
    before: string | null;
    after: string | null;
    amount: string | null;
}

export type FlagColors = "red" | "yellow" | "green" | "blue" | "purple" | "gray";

export interface ModNoteSchema {
    guild: string;
    user: string;
    note: string | null;
    flag: FlagColors | null;
}

export interface PremiumSchema {
    user: string;
    level: number;
    appliesTo: string[];
    expiresAt?: number;
}
