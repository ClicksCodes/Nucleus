import type Discord from "discord.js";
import { Collection, MongoClient } from "mongodb";
import config from "../config/main.json" assert { type: "json" };
import client from "../utils/client.js";

const mongoClient = new MongoClient(config.mongoUrl);
await mongoClient.connect();
const database = mongoClient.db("Nucleus");

export class Guilds {
    guilds: Collection<GuildConfig>;
    defaultData: GuildConfig | null;

    constructor() {
        this.guilds = database.collection<GuildConfig>("guilds");
        this.defaultData = null;
    }

    async setup(): Promise<Guilds> {
        this.defaultData = (await import("../config/default.json", { assert: { type: "json" } }))
            .default as unknown as GuildConfig;
        return this;
    }

    async read(guild: string): Promise<GuildConfig> {
        const entry = await this.guilds.findOne({ id: guild });
        return Object.assign({}, this.defaultData, entry);
    }

    async write(guild: string, set: object | null, unset: string[] | string = []) {
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
        await this.guilds.deleteOne({ id: guild });
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
        await this.histories.insertOne({
            type: type,
            guild: guild,
            user: user.id,
            moderator: moderator ? moderator.id : null,
            reason: reason,
            occurredAt: new Date(),
            before: before ?? null,
            after: after ?? null,
            amount: amount ?? null
        });
    }

    async read(guild: string, user: string, year: number) {
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
        await this.histories.deleteMany({ guild: guild });
    }
}

interface ScanCacheSchema {
    addedAt: Date;
    hash: string;
    data: boolean;
    tags: string[];
}

export class ScanCache {
    scanCache: Collection<ScanCacheSchema>;

    constructor() {
        this.scanCache = database.collection<ScanCacheSchema>("scanCache");
    }

    async read(hash: string) {
        return await this.scanCache.findOne({ hash: hash });
    }

    async write(hash: string, data: boolean, tags?: string[]) {
        await this.scanCache.insertOne({ hash: hash, data: data, tags: tags ?? [], addedAt: new Date() });
    }

    async cleanup() {
        await this.scanCache.deleteMany({ addedAt: { $lt: new Date(Date.now() - (1000 * 60 * 60 * 24 * 31)) }, hash: { $not$text: "http"} });
    }
}

export class PerformanceTest {
    performanceData: Collection<PerformanceDataSchema>;

    constructor() {
        this.performanceData = database.collection<PerformanceDataSchema>("performance");
    }

    async record(data: PerformanceDataSchema) {
        data.timestamp = new Date();
        await this.performanceData.insertOne(data);
    }
    async read() {
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
    }
}

export class ModNotes {
    modNotes: Collection<ModNoteSchema>;

    constructor() {
        this.modNotes = database.collection<ModNoteSchema>("modNotes");
    }

    async create(guild: string, user: string, note: string | null) {
        await this.modNotes.updateOne({ guild: guild, user: user }, { $set: { note: note } }, { upsert: true });
    }

    async read(guild: string, user: string) {
        const entry = await this.modNotes.findOne({ guild: guild, user: user });
        return entry?.note ?? null;
    }

    async delete(guild: string) {
        await this.modNotes.deleteMany({ guild: guild });
    }
}

export class Premium {
    premium: Collection<PremiumSchema>;

    constructor() {
        this.premium = database.collection<PremiumSchema>("premium");
    }

    async updateUser(user: string, level: number) {
        if(!(await this.userExists(user))) await this.createUser(user, level);
        await this.premium.updateOne({ user: user }, { $set: { level: level } }, { upsert: true });
    }

    async userExists(user: string): Promise<boolean> {
        const entry = await this.premium.findOne({ user: user });
        return entry ? true : false;
    }

    async createUser(user: string, level: number) {
        await this.premium.insertOne({ user: user, appliesTo: [], level: level });
    }

    async hasPremium(guild: string) {
        const entry = await this.premium.findOne({
            appliesTo: { $in: [guild] }
        });
        return entry ? true : false;
    }

    async fetchUser(user: string): Promise<PremiumSchema | null> {
        const entry = await this.premium.findOne({ user: user });
        if (!entry) return null;
        return entry;
    }

    async checkAllPremium() {
        const entries = await this.premium.find({}).toArray();
        for(const {user, expiresAt} of entries) {
            if(expiresAt) expiresAt < new Date().getTime() ? await this.premium.deleteOne({user: user}) : null;
            const member = await (await client.guilds.fetch("684492926528651336")).members.fetch(user)
            let level: number = 0;
            if (member.roles.cache.has("1066468879309750313")) {
                level = 99;
            } else if (member.roles.cache.has("1066465491713003520")) {
                level = 1;
            } else if (member.roles.cache.has("1066439526496604194")) {
                level = 2;
            } else if (member.roles.cache.has("1066464134322978912")) {
                level = 3;
            }

            if (level > 0) {
                await this.updateUser(user, level);
            } else {
                await this.premium.updateOne({ user: user }, { expiresAt: (new Date().getTime() + (1000*60*60*24*3)) })
            }
        }
    }

    addPremium(user: string, guild: string) {
        return this.premium.updateOne({ user: user }, { $addToSet: { appliesTo: guild } }, { upsert: true });
    }

    removePremium(user: string, guild: string) {
        return this.premium.updateOne({ user: user }, { $pull: { appliesTo: guild } });
    }
}

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
                user: string[];
                roles: string[];
            }
        }
    };
    autoPublish: {
        enabled: boolean;
        channels: string[];
    }
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
        }
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
            name: string;
            description: string;
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

export interface ModNoteSchema {
    guild: string;
    user: string;
    note: string | null;
}

export interface PremiumSchema {
    user: string;
    level: number;
    appliesTo: string[];
    expiresAt?: number;
}
