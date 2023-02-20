import Discord, { Client, Interaction, AutocompleteInteraction, Collection } from 'discord.js';
import { Logger } from "../utils/log.js";
import Memory from "../utils/memory.js";
import type { VerifySchema } from "../reflex/verify.js";
import { Guilds, History, ModNotes, Premium, PerformanceTest, ScanCache } from "../utils/database.js";
import EventScheduler from "../utils/eventScheduler.js";
import type { RoleMenuSchema } from "../actions/roleMenu.js";
import config from "../config/main.json" assert { type: "json" };


class NucleusClient extends Client {
    logger = Logger;
    config: typeof config = config;
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
        performanceTest: PerformanceTest;
        scanCache: ScanCache;
    };
    preloadPage: Record<string, {command: string, argument: string}> = {};  // e.g. { channelID: { command: privacy, page: 3}}
    commands: Record<string, [{
        command: Discord.SlashCommandBuilder |
                ((builder: Discord.SlashCommandBuilder) => Discord.SlashCommandBuilder) |
                Discord.SlashCommandSubcommandBuilder | ((builder: Discord.SlashCommandSubcommandBuilder) => Discord.SlashCommandSubcommandBuilder) | Discord.SlashCommandSubcommandGroupBuilder | ((builder: Discord.SlashCommandSubcommandGroupBuilder) => Discord.SlashCommandSubcommandGroupBuilder),
        callback: (interaction: Interaction) => Promise<void>,
        check: (interaction: Interaction, partial: boolean) => Promise<boolean> | boolean,
        autocomplete: (interaction: AutocompleteInteraction) => Promise<string[]>
    } | undefined,{name: string, description: string}]> = {};
    fetchedCommands = new Collection<string, Discord.ApplicationCommand>();
    constructor(database: typeof NucleusClient.prototype.database) {
        super({ intents: 0b1100011011011111111111});
        this.database = database;
    }
}

const client = new NucleusClient({
    guilds: await new Guilds().setup(),
    history: new History(),
    notes: new ModNotes(),
    premium: new Premium(),
    eventScheduler: new EventScheduler(),
    performanceTest: new PerformanceTest(),
    scanCache: new ScanCache()
});

export default client;
export { NucleusClient };