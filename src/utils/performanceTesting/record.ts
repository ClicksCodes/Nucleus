import client from "../client.js";
import * as CP from 'child_process';
import * as process from 'process';
import systeminformation from "systeminformation";
import config from "../../config/main.json" assert { type: "json" };
import singleNotify from "../singleNotify.js";


const discordPing = () => {
    return client.ws.ping;
}

const databaseReadTime = async () => {
    const guild = await client.guilds.fetch(config.managementGuildID);
    const user = guild.ownerId;
    const currentYear = new Date().getFullYear();
    const start = Date.now();
    client.database.history.read(guild.id, user, currentYear - 1);
    const end = Date.now();
    return end - start;
}

const resources = async () => {
    return {
        memory: process.memoryUsage().rss / 1024 / 1024,
        cpu: parseFloat(CP.execSync(`ps -p ${process.pid} -o %cpu=`).toString().trim()),
        temperature: (await systeminformation.cpuTemperature()).main
    }
}

const record = async () => {
    if (config.enableDevelopment) return;
    const results = {
        discord: discordPing(),
        databaseRead: await databaseReadTime(),
        resources: await resources()
    };
    if (results.discord > 1000 || results.databaseRead > 500 || results.resources.cpu > 100) {
        singleNotify(
            "performanceTest",
            config.developmentGuildID,
            `Discord ping time: \`${results.discord}ms\`\nDatabase read time: \`${results.databaseRead}ms\`\nCPU usage: \`${results.resources.cpu}%\`\nMemory usage: \`${results.resources.memory}MB\`\nCPU temperature: \`${results.resources.temperature}°C\``,
            "Critical",
            config.owners
        )
    } else {
        singleNotify("performanceTest", config.developmentGuildID, true)
    }

    client.database.performanceTest.record(results)
    setTimeout(async () => {
        await record();
    }, 60 * 1000);
}

export { record };
