import { Logger } from "./utils/log.js";
import runServer from "./api/index.js";
import Memory from "./utils/memory.js";
import type { VerifySchema } from "./reflex/verify.js";
import { Guilds, History, ModNotes, Premium } from "./utils/database.js";
import client from "./utils/client.js";
import EventScheduler from "./utils/eventScheduler.js";
import type { RoleMenuSchema } from "./actions/roleMenu.js";

await client.registerCommandsIn(`dist/commands`);
await client.registerEventsIn(`dist/events`);
client.on("ready", () => {
    runServer(client);
});
process.on("unhandledRejection", (err) => {
    console.error(err);
});

client.logger = new Logger() as Logger;
client.verify = {} as Record<string, VerifySchema>;
client.roleMenu = {} as Record<string, RoleMenuSchema>;
client.memory = new Memory() as Memory;
client.noLog = [] as string[];
client.database = {
    guilds: await new Guilds().setup(),
    history: new History(),
    notes: new ModNotes(),
    premium: new Premium(),
    eventScheduler: await new EventScheduler().start()
} as {
    guilds: Guilds;
    history: History;
    notes: ModNotes;
    premium: Premium;
    eventScheduler: EventScheduler;
};

await client.login();
