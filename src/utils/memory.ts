import client from "./client.js";
import type { GuildConfig } from "./database.js";

interface GuildData {
    lastUpdated: number;
    filters: GuildConfig["filters"];
    logging: GuildConfig["logging"];
    tickets: GuildConfig["tickets"];
    tags: GuildConfig["tags"];
    autoPublish: GuildConfig["autoPublish"];
}

class Memory {
    memory: Map<string, GuildData>;
    constructor() {
        this.memory = new Map<string, GuildData>();

        setInterval(() => {
            for (const [guild, guildData] of this.memory.entries()) {
                if (guildData.lastUpdated + 15 * 60 * 1000 < Date.now()) {
                    this.memory.delete(guild);
                }
            }
        }, 1000 * 60 * 30);
    }

    async readGuildInfo(guild: string): Promise<GuildData> {
        if (!this.memory.has(guild)) {
            const guildData = await client.database.guilds.read(guild);
            this.memory.set(guild, {
                lastUpdated: Date.now(),
                filters: guildData.filters,
                logging: guildData.logging,
                tickets: guildData.tickets,
                tags: guildData.tags,
                autoPublish: guildData.autoPublish
            });
        }
        return this.memory.get(guild)!;
    }

    async forceUpdate(guild: string) {
        if (this.memory.has(guild)) this.memory.delete(guild);
    }
}

export default Memory;
