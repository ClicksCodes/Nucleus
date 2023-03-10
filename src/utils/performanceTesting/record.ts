import client from "../client.js";
import * as CP from "child_process";
import * as process from "process";
import systeminformation from "systeminformation";
import config from "../../config/main.js";
import singleNotify from "../singleNotify.js";

const discordPing = () => {
    return client.ws.ping;
};

const databaseReadTime = async () => {
    const guild = await client.guilds.fetch(config.managementGuildID);
    const user = guild.ownerId;
    const currentYear = new Date().getFullYear();
    const start = Date.now();
    await client.database.history.read(guild.id, user, currentYear - 1);
    const end = Date.now();
    return end - start;
};

const resources = async () => {
    return {
        memory: process.memoryUsage().rss / 1024 / 1024,
        cpu: parseFloat(CP.execSync(`ps -p ${process.pid} -o %cpu=`).toString().trim()),
        temperature: (await systeminformation.cpuTemperature()).main
    };
};

const record = async () => {
    if (config.enableDevelopment) return;
    const results = {
        discord: discordPing(),
        databaseRead: await databaseReadTime(),
        resources: await resources()
    };
    let bold: string;
    switch (true) {
        case results.discord > 1000:
            bold = "DiscordPing";
            break;
        case results.databaseRead > 500:
            bold = "DatabaseRead";
            break;
        case results.resources.cpu > 100:
            bold = "CPUUsage";
            break;
        case results.resources.memory > 5000:
            bold = "MemoryUsage";
            break;
        case results.resources.temperature > 80:
            bold = "Temperature";
            break;
        default:
            bold = "None";
    }
    if (
        results.discord > 1000 ||
        results.databaseRead > 500 ||
        results.resources.cpu > 100 ||
        results.resources.memory > 5000 ||
        results.resources.temperature > 80
    ) {
        await singleNotify(
            "performanceTest",
            config.developmentGuildID,
            `${bold === "DiscordPing" ? "**Discord ping time:**" : "Discord ping time:"} \`${results.discord}ms\`\n` +
                `${bold === "DatabaseRead" ? "**Database read time:**" : "Database read time:"} \`${
                    results.databaseRead
                }ms\`\n` +
                `${bold === "CPUUsage" ? "**CPU usage:**" : "CPU usage:"} \`${results.resources.cpu}%\`\n` +
                `${bold === "MemoryUsage" ? "**Memory usage:**" : "Memory usage:"} \`${Math.round(
                    results.resources.memory
                )}MB\`\n` +
                `${bold === "Temperature" ? "**CPU temperature:**" : "CPU temperature:"} \`${
                    results.resources.temperature
                }°C\``,
            "Critical",
            config.owners
        );
    } else {
        await singleNotify("performanceTest", config.developmentGuildID, true);
    }

    await client.database.performanceTest.record(results);
    setTimeout(() => {
        void record();
    }, 60 * 1000);
};

export { record };
