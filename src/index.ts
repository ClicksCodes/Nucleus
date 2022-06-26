
import { Logger } from './utils/log.js';
import runServer from './api/index.js';
import Memory from './utils/memory.js';
import { Guilds, History, ModNotes, EventSchedulerDatabase } from './utils/database.js';
import client from './utils/client.js';
import EventScheduler from './utils/eventScheduler.js';

await client.registerCommandsIn("./commands");
await client.registerEventsIn("./events");
client.on("ready", () => {
    runServer(client);
});

client.logger = new Logger()
client.verify = {}
client.roleMenu = {}
client.memory = new Memory()
client.database = {
    guilds: await new Guilds().setup(),
    history: await new History().setup(),
    notes: await new ModNotes().setup(),
    eventScheduler: new EventSchedulerDatabase()
}

await client.login();