import { HaikuClient } from "jshaiku";
import { Intents } from "discord.js";
import config from "../config/main.json" assert {type: "json"};

const client = new HaikuClient({
    intents: new Intents(32767).bitfield  // This is a way of specifying all intents w/o having to type them out
}, config);

export default client;