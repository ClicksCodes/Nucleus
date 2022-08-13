import type Discord from "discord.js";
import { Collection, MongoClient } from "mongodb";
// @ts-expect-error
import structuredClone from "@ungap/structured-clone";
import config from "../config/main.json" assert { type: "json" };

const mongoClient = new MongoClient(config.mongoUrl);
await mongoClient.connect();
const database = mongoClient.db("Nucleus");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Entry = (data: any) => {
    data = data ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.getKey = (key: any) => data[key];
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get(target: Record<string, any>, prop: string, receiver: any) {
            let dataToReturn = data[prop];
            if (dataToReturn === null) return Reflect.get(target, prop, receiver);
            if (typeof dataToReturn === "object" && !Array.isArray(dataToReturn))
                dataToReturn = new Proxy(Reflect.get(target, prop, receiver), Entry(dataToReturn));
            return dataToReturn ?? Reflect.get(target, prop, receiver);
        }
    };
};

export class Guilds {
    guilds: Collection<GuildConfig>;
    defaultData: GuildConfig | null;

    constructor() {
        this.guilds = database.collection<GuildConfig>("guilds");
        this.defaultData = null;
    }

    async setup() {
        this.defaultData = (await import("../config/default.json", { assert: { type: "json" } }))
            .default as unknown as GuildConfig;
        return this;
    }

    async read(guild: string) {
        const entry = await this.guilds.findOne({ id: guild });
        return new Proxy(structuredClone(this.defaultData), Entry(entry)) as unknown as GuildConfig;
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
        console.log(Array.isArray(value));
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
}

export class Premium {
    premium: Collection<PremiumSchema>;

    constructor() {
        this.premium = database.collection<PremiumSchema>("premium");
    }

    async hasPremium(guild: string) {
        const entry = await this.premium.findOne({
            appliesTo: { $in: [guild] }
        });
        return entry !== null;
    }
}

export interface GuildConfig {
    id: string;
    version: number;
    singleEventNotifications: {
        statsChannelDeleted: boolean;
    };
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
            channels: string[];
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
    };
    welcome: {
        enabled: boolean;
        verificationRequired: {
            message: boolean;
            role: string | null;
        };
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
            toLog: string | null;
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
        types: string | null;
        customTypes: string[];
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
    expires: Date;
    appliesTo: string[];
}