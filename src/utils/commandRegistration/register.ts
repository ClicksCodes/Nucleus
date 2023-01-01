import { Interaction, SlashCommandBuilder } from 'discord.js';
import config from "../../config/main.json" assert { type: "json" };
import client from "../client.js";
import fs from "fs";
import Discord from "discord.js";


const colours = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    none: "\x1b[0m"
}

async function registerCommands() {
    const developmentMode = config.enableDevelopment;
    const commands = [];

    const files = fs.readdirSync(config.commandsFolder, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    console.log(`Registering ${files.length} commands`)
    let i = 0;
    for (const file of files) {
        const last = i === files.length - 1 ? "└" : "├";
        if (file.isDirectory()) {
            console.log(`${last}─ ${colours.yellow}Loading subcommands of ${file.name}${colours.none}`)
            commands.push((await import(`../../../${config.commandsFolder}/${file.name}/_meta.js`)).command);
        } else if (file.name.endsWith(".js")) {
            console.log(`${last}─ ${colours.yellow}Loading command ${file.name}${colours.none}`)
            const fetched = (await import(`../../../${config.commandsFolder}/${file.name}`));
            commands.push(fetched.command);
            client.commands["commands/" + fetched.command.name] = fetched;
        }
        i++;
        console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.green}Loaded ${file.name} [${i} / ${files.length}]${colours.none}`)
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

    const updateCommands = process.argv.includes("--update-commands");
    if (developmentMode) {
        const guild = await client.guilds.fetch(config.developmentGuildID);
        if (updateCommands) guild.commands.set(processed);
        console.log(`Commands registered in ${guild.name}`)
    } else {
        if (updateCommands) client.application!.commands.set(processed);
        console.log(`Commands registered globally`)
    }

};

async function registerEvents() {
    console.log("Reading events")
    const files = fs.readdirSync(config.eventsFolder, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    console.log(`Registering ${files.length} events`)
    let i = 0;
    let errors = 0;
    for (const file of files) {
        const last = i === files.length - 1 ? "└" : "├";
        i++;
        try {
            console.log(`${last}─ ${colours.yellow}Loading event ${file.name}${colours.none}`)
            const event = (await import(`../../../${config.eventsFolder}/${file.name}`));

            client.on(event.event, event.callback.bind(null, client));

            console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.green}Loaded ${file.name} [${i} / ${files.length}]${colours.none}`)
        } catch (e) {
            errors++;
            console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.red}Failed to load ${file.name} [${i} / ${files.length}]${colours.none}`)
        }
    }
    console.log(`Loaded ${files.length - errors} events (${errors} failed)`)
};

async function registerCommandHandler() {
    client.on("interactionCreate", async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const commandName = interaction.commandName;
        const subcommandGroupName = interaction.options.getSubcommandGroup(false);
        const subcommandName = interaction.options.getSubcommand(false);

        const fullCommandName = "commands/" + commandName + (subcommandGroupName ? `/${subcommandGroupName}` : "") + (subcommandName ? `/${subcommandName}` : "");

        const command = client.commands[fullCommandName];
        const callback = command?.callback;
        const check = command?.check;

        if (!callback) return;
        if (check) {
            let result;
            try {
                result = await check(interaction);
            } catch (e) {
                console.log(e);
                result = false;
            }
            if (!result) return;
        }
        callback(interaction);
    });
}

export default async function register() {
    await registerCommands();
    await registerCommandHandler();
    await registerEvents();
    console.log(`${colours.green}Registered commands and events${colours.none}`)
};
