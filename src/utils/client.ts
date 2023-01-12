import Discord, { Client, Interaction, AutocompleteInteraction, GatewayIntentBits } from 'discord.js';
import { Logger } from "../utils/log.js";
import Memory from "../utils/memory.js";
import type { VerifySchema } from "../reflex/verify.js";
import { Guilds, History, ModNotes, Premium, PerformanceTest } from "../utils/database.js";
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
    };
    commands: Record<string, {
        command: Discord.SlashCommandBuilder |
                ((builder: Discord.SlashCommandBuilder) => Discord.SlashCommandBuilder) |
                Discord.SlashCommandSubcommandBuilder | ((builder: Discord.SlashCommandSubcommandBuilder) => Discord.SlashCommandSubcommandBuilder) | Discord.SlashCommandSubcommandGroupBuilder | ((builder: Discord.SlashCommandSubcommandGroupBuilder) => Discord.SlashCommandSubcommandGroupBuilder),
        callback: (interaction: Interaction) => Promise<void>,
        check: (interaction: Interaction) => Promise<boolean> | boolean,
        autocomplete: (interaction: AutocompleteInteraction) => Promise<string[]>
    }> = {};

    constructor(database: typeof NucleusClient.prototype.database) {
        super({ intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildMembers
        ]});
        this.database = database;
    }
}

const client = new NucleusClient({
    guilds: await new Guilds().setup(),
    history: new History(),
    notes: new ModNotes(),
    premium: new Premium(),
    eventScheduler: new EventScheduler(),
    performanceTest: new PerformanceTest()
});

export default client;
export { NucleusClient };