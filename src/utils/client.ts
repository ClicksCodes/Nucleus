import { Client } from 'discord.js';
import { Logger } from "../utils/log.js";
import Memory from "../utils/memory.js";
import type { VerifySchema } from "../reflex/verify.js";
import { Guilds, History, ModNotes, Premium } from "../utils/database.js";
import EventScheduler from "../utils/eventScheduler.js";
import type { RoleMenuSchema } from "../actions/roleMenu.js";


class NucleusClient extends Client {
    logger = Logger;
    verify: Record<string, VerifySchema> = {};
    roleMenu: Record<string, RoleMenuSchema> = {};
    memory: Memory = new Memory() as Memory;
    noLog: string[] = [];
    database: {
        guilds: Guilds;
        history: History;
        notes: ModNotes;
        premium: Premium;
        eventScheduler: EventScheduler;
    };

    constructor(database: typeof NucleusClient.prototype.database) {
        super({ intents: 32767 });
        this.database = database;
    }
}

const client = new NucleusClient({
    guilds: new Guilds(),
    history: new History(),
    notes: new ModNotes(),
    premium: new Premium(),
    eventScheduler: new EventScheduler()
});

export default client;
export { NucleusClient };