import client from "./client.js";

class Memory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memory: Record<string, any>;
    constructor() {
        this.memory = {};

        setInterval(() => {
            for (const guild in this.memory) {
                if (this.memory[guild].updated + 15 * 60 * 1000 < Date.now()) {
                    delete this.memory[guild];
                }
            }
        }, 1000 * 60 * 30);
    }

    async readGuildInfo(guild: string): Promise<object> {
        if (!this.memory[guild]) {
            const guildData = await client.database.guilds.read(guild);
            this.memory[guild] = {
                lastUpdated: Date.now(),
                filters: guildData.filters,
                logging: guildData.logging,
                tickets: guildData.tickets
            };
        }
        return this.memory[guild];
    }
}

export default Memory;
