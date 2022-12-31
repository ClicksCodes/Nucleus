import type { SlashCommandSubcommandGroupBuilder } from "@discordjs/builders";
import type { SlashCommandBuilder } from "discord.js";
import config from "../../config/main.json" assert { type: "json" };
import getSubcommandsInFolder from "./getFilesInFolder.js";


const colours = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    none: "\x1b[0m"
}


export async function group(name: string, description: string, path: string) {
    console.log(`│  ├─ Loading group ${name}`)
    const fetched = await getSubcommandsInFolder(config.commandsFolder + "/" + path, "│  ")
    console.log(`│  │  └─ ${fetched.errors ? colours.red : colours.green}Loaded ${fetched.subcommands.length} subcommands for ${name} (${fetched.errors} failed)${colours.none}`)
    return (subcommandGroup: SlashCommandSubcommandGroupBuilder) => {
        subcommandGroup
            .setName(name)
            .setDescription(description)

        for (const subcommand of fetched.subcommands) {
            subcommandGroup.addSubcommand(subcommand);
        };

        return subcommandGroup;
    };
}

export async function command(name: string, description: string, path: string) {
    const fetched = await getSubcommandsInFolder(config.commandsFolder + "/" + path);
    console.log(`│  ├─ ${fetched.errors ? colours.red : colours.green}Loaded ${fetched.subcommands.length} subcommands and ${fetched.subcommandGroups.length} subcommand groups for ${name} (${fetched.errors} failed)${colours.none}`)
    return (command: SlashCommandBuilder) => {
        command.setName(name)
        command.setDescription(description)

        for (const subcommand of fetched.subcommands) {
            command.addSubcommand(subcommand);
        }
        for (const group of fetched.subcommandGroups) {
            command.addSubcommandGroup(group);
        };
        return command;
    };
}
