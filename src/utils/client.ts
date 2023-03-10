import Discord, { Client, Interaction, AutocompleteInteraction, Collection } from "discord.js";
import { Logger } from "../utils/log.js";
import Memory from "../utils/memory.js";
import type { VerifySchema } from "../reflex/verify.js";
import { Guilds, History, ModNotes, Premium, PerformanceTest, ScanCache, Transcript } from "../utils/database.js";
import EventScheduler from "../utils/eventScheduler.js";
import type { RoleMenuSchema } from "../actions/roleMenu.js";
import config from "../config/main.js";
import { Octokit } from "octokit";

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
        transcripts: Transcript;
    };
    GitHub = new Octokit({ auth: config.githubPAT });
    preloadPage: Record<string, { command: string; argument: string }> = {}; // e.g. { channelID: { command: privacy, page: 3}}
    commands: Record<
        string,
        [
            (
                | {
                      command:
                          | Discord.SlashCommandBuilder
                          | ((builder: Discord.SlashCommandBuilder) => Discord.SlashCommandBuilder)
                          | Discord.SlashCommandSubcommandBuilder
                          | ((builder: Discord.SlashCommandSubcommandBuilder) => Discord.SlashCommandSubcommandBuilder)
                          | Discord.SlashCommandSubcommandGroupBuilder
                          | ((
                                builder: Discord.SlashCommandSubcommandGroupBuilder
                            ) => Discord.SlashCommandSubcommandGroupBuilder);
                      callback: (interaction: Interaction) => Promise<void>;
                      check: (interaction: Interaction, partial: boolean) => Promise<boolean> | boolean;
                      autocomplete: (interaction: AutocompleteInteraction) => Promise<string[]>;
                  }
                | undefined
            ),
            { name: string; description: string }
        ]
    > = {};
    fetchedCommands = new Collection<string, Discord.ApplicationCommand>();
    constructor(database: typeof NucleusClient.prototype.database) {
        super({ intents: 3276543 });
        this.database = database;
    }
}
const client = new NucleusClient({
    guilds: new Guilds(),
    history: new History(),
    notes: new ModNotes(),
    premium: new Premium(),
    eventScheduler: new EventScheduler(),
    performanceTest: new PerformanceTest(),
    scanCache: new ScanCache(),
    transcripts: new Transcript()
});

export default client;
export { NucleusClient };
