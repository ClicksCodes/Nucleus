import { Collection, Db, MongoClient } from 'mongodb';


export const Entry = data => {
    data = data ?? {};
    return {
        get(target, prop, receiver) {
            let dataToReturn = data[prop]
            if (dataToReturn === null ) return Reflect.get(target, prop, receiver);
            if (typeof dataToReturn === "object" && !Array.isArray(dataToReturn)) dataToReturn = new Proxy(
                Reflect.get(target, prop, receiver),
                Entry(dataToReturn),
            )
            return dataToReturn ?? Reflect.get(target, prop, receiver);
        }
    }
}


export default class Database {
    mongoClient: MongoClient;
    database: Db;
    guilds: Collection<GuildConfig>;
    defaultData: GuildConfig;

    constructor(url) {
        this.mongoClient = new MongoClient(url);
    }

    async connect() {
        await this.mongoClient.connect()
        this.database = this.mongoClient.db("Nucleus");
        this.guilds = this.database.collection<GuildConfig>("guilds");
        await this.guilds.createIndex({ id: "text" }, { unique: true });
        this.defaultData = (await import("../config/default.json", { assert: { type: "json" }})).default as unknown as GuildConfig;
        return this;
    }

    async read(guild: string) {
        let entry = await this.guilds.findOne({ id: guild });
        return new Proxy(this.defaultData, Entry(entry)) as unknown as GuildConfig
    }

    async write(guild: string, config: GuildConfig) {
        await this.guilds.updateOne({ id: guild }, { $set: config }, { upsert: true });
    }
}

export interface GuildConfig {
    id: string,
    version: number,
    singleEventNotifications: {
        statsChannelDeleted: boolean
    }
    filters: {
        images: {
            NSFW: boolean,
            size: boolean
        },
        malware: boolean,
        wordFilter: {
            enabled: boolean,
            words: {
                strict: string[],
                loose: string[]
            },
            allowed: {
                users: string[],
                roles: string[],
                channels: string[]
            }
        },
        invite: {
            enabled: boolean,
            allowed: {
                users: string[],
                channels: string[],
                roles: string[]
            }
        },
        pings: {
            mass: number,
            everyone: boolean,
            roles: boolean,
            allowed: {
                roles: string[],
                rolesToMention: string[],
                users: string[],
                channels: string[]
            }
        }
    }
    welcome: {
        enabled: boolean,
        verificationRequired: {
            message: boolean,
            role: string
        },
        welcomeRole: string,
        channel: string,
        message: string
    }
    stats: {
        enabled: boolean,
        channel: string,
        text: string
    }[]
    logging: {
        logs: {
            enabled: boolean,
            channel: string,
            toLog: string
        },
        staff: {
            channel: string
        }
    }
    verify: {
        enabled: boolean,
        role: string
    }
    tickets: {
        enabled: boolean,
        category: string,
        types: string,
        customTypes: string[],
        supportRole: string,
        maxTickets: number
    }
    moderation: {
        mute: {
            timeout: boolean,
            role: string,
            text: string,
            link: string
        },
        kick: {
            text: string,
            link: string
        },
        ban: {
            text: string,
            link: string
        },
        softban: {
            text: string,
            link: string
        },
        warn: {
            text: string,
            link: string
        },
        role: {
            role: string
        }
    }
    tracks: {
        name: string,
        retainPrevious: boolean,
        nullable: boolean,
        track: string[],
        manageableBy: string[]
    }[]
    roleMenu: {
        enabled: boolean,
        allowWebUI: boolean,
        options: {
            name: string,
            description: string,
            min: number,
            max: number,
            options: {
                name: string,
                description: string,
                role: string
            }[]
        }[]
    }
    tags: {}
};