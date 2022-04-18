import { HaikuClient } from 'jshaiku';
import { Intents } from 'discord.js';
import config from './config/main.json' assert {type: 'json'};
import { Logger } from './utils/log.js';
const client = new HaikuClient({
    intents: new Intents(32767).bitfield,  // This is a way of specifying all intents w/o having to type them out
}, config);

await client.registerCommandsIn("./commands");
await client.registerEventsIn("./events");

client.logger = new Logger()
client.verify = {}
client.roleMenu = {}

await client.login();