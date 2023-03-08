import "@total-typescript/ts-reset";

import runServer from "./api/index.js";
import client from "./utils/client.js";
import config from "./config/main.js";
import register from "./utils/commandRegistration/register.js";
import { record as recordPerformance } from "./utils/performanceTesting/record.js";

client.on("ready", async () => {
    console.log(`Logged in as ${client.user!.tag}!`);
    await register();
    runServer(client);
    if (config.enableDevelopment) {
        client.fetchedCommands = await client.guilds.cache.get(config.developmentGuildID)?.commands.fetch()!;
    } else {
        client.fetchedCommands = await client.application?.commands.fetch()!;
    }
    await client.database.premium.checkAllPremium();
    await client.database.guilds.updateAllGuilds();
});

process.on("unhandledRejection", (err) => {
    console.error(err);
});
process.on("uncaughtException", (err) => {
    console.error(err);
});

await client.login(config.enableDevelopment ? config.developmentToken : config.token);

await recordPerformance();
