import { SlashCommandBuilder } from 'discord.js';
import config from "../../config/main.json" assert { type: "json" };
import client from "../client.js";
import fs from "fs";


async function registerCommands() {
    const developmentMode = config.enableDevelopment;
    const commands = [];

    const files = fs.readdirSync(config.commandsFolder, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    console.log(`Registering ${files.length} commands`)
    let i = 0;
    for (const file of files) {
        // Box drawing characters: | └ ─ ┌ ┐ ┘ ┬ ┤ ├ ┴ ┼
        console.log(`├─ ${file.name}`)
        if (file.isDirectory()) {
            commands.push((await import(`../../../${config.commandsFolder}/${file.name}/_meta.js`)).command);
        } else if (file.name.endsWith(".js")) {
            commands.push((await import(`../../../${config.commandsFolder}/${file.name}`)).command);
        }
        i++;
        console.log(`├─ Loaded ${file.name} [${i} / ${files.length}]`)
    }
    console.log(`Loaded ${commands.length} commands, processing...`)
    const processed = []

    for (const subcommand of commands) {
        if (subcommand instanceof Function) {
            processed.push(subcommand(new SlashCommandBuilder()))
        } else {
            processed.push(subcommand)
        }
    }

    console.log(`Processed ${commands.length} commands, registering...`)

    if (developmentMode) {
        const guild = await client.guilds.fetch(config.developmentGuildID);
        guild.commands.set([])
        guild.commands.set(processed);
        console.log(`Commands registered in ${guild.name}`)
    } else {
        client.application!.commands.set([])
        client.application!.commands.set(processed);
        console.log(`Commands registered globally`)
    }

};

async function registerEvents() {
    // pass
};

export default async function register() {
    console.log("> Registering commands")
    await registerCommands();
    await registerEvents();
};
