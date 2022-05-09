import readConfig from "./readConfig.js";

class Memory {
    memory: {};
    constructor() {
        this.memory = {};
    }

    async readGuildInfo(guild: string): Promise<object> {
        if (!this.memory[guild]) {
            let guildData = await readConfig(guild);
            this.memory[guild] = {
                filters: guildData.filters,
                logging: guildData.logging,
                tickets: guildData.tickets,
            }; // TODO: REMOVE GUILD FROM MEMORY WHEN THESE UPDATE
        }
        return this.memory[guild];
    }
}

export default Memory;