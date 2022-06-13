import client from "./client.js";

class Memory {
    memory: {};
    constructor() {
        this.memory = {};

        setInterval(() => {
            for (let guild in this.memory) {
                if (this.memory[guild].updated + 15 * 60 * 1000 < Date.now()) {
                    delete this.memory[guild];
                }
            }
        }, 1000 * 60 * 30)
    }

    async readGuildInfo(guild: string): Promise<object> {
        if (!this.memory[guild]) {
            let guildData = await client.database.read(guild);
            this.memory[guild] = {
                lastUpdated: Date.now(),
                filters: guildData.filters,
                logging: guildData.logging,
                tickets: guildData.tickets,
            };
        };
        return this.memory[guild];
    }
}

export default Memory;
