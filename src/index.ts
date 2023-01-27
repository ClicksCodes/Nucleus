import runServer from "./api/index.js";
import client from "./utils/client.js";
import config from "./config/main.json" assert { type: "json" };
import register from "./utils/commandRegistration/register.js";
import { record as recordPerformance } from "./utils/performanceTesting/record.js";

client.on("ready", async () => {
    console.log(`Logged in as ${client.user!.tag}!`);
    register();
    runServer(client);
    if (config.enableDevelopment) {
        client.fetchedCommands = await client.guilds.cache.get(config.developmentGuildID)?.commands.fetch()!;
    } else {
        client.fetchedCommands = await client.application?.commands.fetch()!;
    }
});
process.on("unhandledRejection", (err) => { console.error(err) });
process.on("uncaughtException", (err) => { console.error(err) });

await client.login(config.enableDevelopment ? config.developmentToken : config.token)

await recordPerformance();