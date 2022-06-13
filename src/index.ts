
import config from './config/main.json' assert {type: 'json'};
import { Logger } from './utils/log.js';
import runServer from './api/index.js';
import Memory from './utils/memory.js';
import Database from './utils/database.js';
import client from './utils/client.js';

await client.registerCommandsIn("./commands");
await client.registerEventsIn("./events");
client.on("ready", () => {
    runServer(client);
});

client.logger = new Logger()
client.verify = {}
client.roleMenu = {}
client.memory = new Memory()
client.database = await new Database(config.mongoUrl).connect()

await client.login();