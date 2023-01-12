import client from "../client.js";
import { resourceUsage } from "process";
import { spawn } from "child_process";
import config from "../../config/main.json" assert { type: "json" };


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

const resources = () => {
    const current = resourceUsage();
    const temperatureRaw = spawn("acpi", ["-t"])
    let temperatureData: number = 0;
    temperatureRaw.stdout.on("data", (data) => {
        return temperatureData = data.toString().split(", ")[1].split(" ")[0];  // °C
    })
    return {
        memory: current.sharedMemorySize,
        cpu: current.userCPUTime + current.systemCPUTime,
        temperature: temperatureData
    }
}

const record = async () => {
    const results = {
        discord: discordPing(),
        databaseRead: await databaseReadTime(),
        resources: resources()
    }
    client.database.performanceTest.record(results)
    setInterval(async () => {
        record();
    }, 10 * 1000);
}

export { record };