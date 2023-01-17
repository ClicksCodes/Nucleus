import runServer from "./api/index.js";
import client from "./utils/client.js";
import config from "./config/main.json" assert { type: "json" };
import register from "./utils/commandRegistration/register.js";
import { record as recordPerformance } from "./utils/performanceTesting/record.js";

client.on("ready", () => {
    console.log(`Logged in as ${client.user!.tag}!`);
    register();
    runServer(client);
});
process.on("unhandledRejection", (err) => { console.error(err) });
process.on("uncaughtException", (err) => { console.error(err) });

await client.login(config.enableDevelopment ? config.developmentToken : config.token)

await recordPerformance();