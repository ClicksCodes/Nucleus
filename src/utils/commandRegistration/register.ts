import type { CommandInteraction } from 'discord.js';
import Discord, { Interaction, SlashCommandBuilder, ApplicationCommandType } from 'discord.js';
import config from "../../config/main.json" assert { type: "json" };
import client from "../client.js";
import fs from "fs";
import EmojiEmbed from '../generateEmojiEmbed.js';
import getEmojiByName from '../getEmojiByName.js';

const colours = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    purple: "\x1b[35m",
    none: "\x1b[0m"
}

async function registerCommands() {
    const commands = [];

    const files: fs.Dirent[] = fs.readdirSync(config.commandsFolder, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    console.log(`Registering ${files.length} commands`)
    let i = 0;
    for (const file of files) {
        const last = i === files.length - 1 ? "└" : "├";
        if (file.isDirectory()) {
            console.log(`${last}─ ${colours.yellow}Loading subcommands of ${file.name}${colours.none}`)
            const fetched = (await import(`../../../${config.commandsFolder}/${file.name}/_meta.js`)).command;
            commands.push(fetched);
        } else if (file.name.endsWith(".js")) {
            console.log(`${last}─ ${colours.yellow}Loading command ${file.name}${colours.none}`)
            const fetched = (await import(`../../../${config.commandsFolder}/${file.name}`));
            fetched.command.setDMPermission(fetched.allowedInDMs ?? false)
            fetched.command.setNameLocalizations(fetched.nameLocalizations ?? {})
            fetched.command.setDescriptionLocalizations(fetched.descriptionLocalizations ?? {})
            if (fetched.nameLocalizations || fetched.descriptionLocalizations) console.log("AAAAA")
            commands.push(fetched.command);
            client.commands["commands/" + fetched.command.name] = fetched;
        }
        i++;
        console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.green}Loaded ${file.name} [${i} / ${files.length}]${colours.none}`)
    }
    console.log(`${colours.yellow}Loaded ${commands.length} commands, processing...`)
    const processed = []

    for (const subcommand of commands) {
        if (subcommand instanceof Function) {
            processed.push(subcommand(new SlashCommandBuilder()))
        } else {
            processed.push(subcommand)
        }
    }

    console.log(`${colours.green}Processed ${processed.length} commands`)
    return processed;

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

async function registerContextMenus() {
    console.log("Reading context menus")
    const messageFiles = fs.readdirSync(config.messageContextFolder, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    const userFiles = fs.readdirSync(config.userContextFolder, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    console.log(`Registering ${messageFiles.length} message context menus and ${userFiles.length} user context menus`)
    let i = 0;
    let errors = 0;
    const commands: (Discord.ContextMenuCommandBuilder)[] = []
    const totalFiles = messageFiles.length + userFiles.length;
    for (const file of messageFiles) {
        const last = i === totalFiles - 1 ? "└" : "├";
        i++;
        try {
            console.log(`${last}─ ${colours.yellow}Loading message context menu ${file.name}${colours.none}`)
            const context = (await import(`../../../${config.messageContextFolder}/${file.name}`));
            context.command.setType(ApplicationCommandType.Message);
            context.command.setDMPermission(context.allowedInDMs ?? false)
            context.command.setNameLocalizations(context.nameLocalizations ?? {})
            commands.push(context.command);

            client.commands["contextCommands/message/" + context.command.name] = context;

            console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.green}Loaded ${file.name} [${i} / ${totalFiles}]${colours.none}`)
        } catch (e) {
            errors++;
            console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.red}Failed to load ${file.name} [${i} / ${totalFiles}] | ${e}${colours.none}`)
        }
    }
    for (const file of userFiles) {
        const last = i === totalFiles - 1 ? "└" : "├";
        i++;
        try {
            console.log(`${last}─ ${colours.yellow}Loading user context menu ${file.name}${colours.none}`)
            const context = (await import(`../../../${config.userContextFolder}/${file.name}`));
            context.command.setType(ApplicationCommandType.User);
            commands.push(context.command);

            client.commands["contextCommands/user/" + context.command.name] = context;

            console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.green}Loaded ${file.name} [${i} / ${totalFiles}]${colours.none}`)
        } catch (e) {
            errors++;
            console.log(`${last.replace("└", " ").replace("├", "│")}  └─ ${colours.red}Failed to load ${file.name} [${i} / ${totalFiles}]${colours.none}`)
        }
    }

    console.log(`Loaded ${messageFiles.length + userFiles.length - errors} context menus (${errors} failed)`)
    return commands;
};

async function registerCommandHandler() {
    client.on("interactionCreate", async (interaction: Interaction) => {
        if (interaction.isUserContextMenuCommand()) {;
            const commandName = "contextCommands/user/" + interaction.commandName;
            execute(client.commands[commandName]?.check, client.commands[commandName]?.callback, interaction)
            return;
        } else if (interaction.isMessageContextMenuCommand()) {
            const commandName = "contextCommands/message/" + interaction.commandName;
            execute(client.commands[commandName]?.check, client.commands[commandName]?.callback, interaction)
            return;
        } else if (interaction.isAutocomplete()) {
            const commandName = interaction.commandName;
            const subcommandGroupName = interaction.options.getSubcommandGroup(false);
            const subcommandName = interaction.options.getSubcommand(false);

            const fullCommandName = "commands/" + commandName + (subcommandGroupName ? `/${subcommandGroupName}` : "") + (subcommandName ? `/${subcommandName}` : "");

            const choices = await client.commands[fullCommandName]?.autocomplete(interaction);

            const formatted = (choices ?? []).map(choice => {
                return { name: choice, value: choice }
            })
            interaction.respond(formatted)
        } else if (interaction.isChatInputCommand()) {
            const commandName = interaction.commandName;
            const subcommandGroupName = interaction.options.getSubcommandGroup(false);
            const subcommandName = interaction.options.getSubcommand(false);

            const fullCommandName = "commands/" + commandName + (subcommandGroupName ? `/${subcommandGroupName}` : "") + (subcommandName ? `/${subcommandName}` : "");

            const command = client.commands[fullCommandName];
            const callback = command?.callback;
            const check = command?.check;
            execute(check, callback, interaction);
        }
    });
}

async function execute(check: Function | undefined, callback: Function | undefined, data: CommandInteraction) {
    if (!callback) return;
    if (check) {
        let result;
        try {
            result = await check(data);
        } catch(e) {
            result = false;
        }
        if (result === false) return;
        if (typeof result === "string") {
            const { NucleusColors } = client.logger
            return data.reply({embeds: [new EmojiEmbed()
                .setDescription(result)
                .setColor(NucleusColors.red)
                .setEmoji(getEmojiByName("CONTROL.BLOCKCROSS"))
            ], ephemeral: true});
        };
    }
    callback(data);
}


export default async function register() {
    let commandList: ( Discord.SlashCommandBuilder | Discord.ContextMenuCommandBuilder )[] = [];
    commandList = commandList.concat(await registerCommands());
    commandList = commandList.concat(await registerContextMenus());
    if (process.argv.includes("--update-commands")) {
        if (config.enableDevelopment) {
            const guild = await client.guilds.fetch(config.developmentGuildID);
            console.log(`${colours.purple}Registering commands in ${guild!.name}${colours.none}`)
            await guild.commands.set(commandList);
        } else {
            console.log(`${colours.blue}Registering commands in production mode${colours.none}`)
            await client.application?.commands.set(commandList);
        }
    }

    await registerCommandHandler();
    await registerEvents();
    console.log(`${colours.green}Registered commands, events and context menus${colours.none}`)
    console.log(
        (config.enableDevelopment ? `${colours.purple}Bot started in Development mode` :
        `${colours.blue}Bot started in Production mode`) + colours.none)
};
