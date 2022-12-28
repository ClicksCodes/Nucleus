import type { SlashCommandSubcommandGroupBuilder } from "@discordjs/builders";
import type { SlashCommandBuilder } from "discord.js";
import config from "../../config/main.json" assert { type: "json" };
import getSubcommandsInFolder from "./getFilesInFolder.js";


export async function group(name: string, description: string, path: string) {
    const fetched = await getSubcommandsInFolder(config.commandsFolder + "/" + path)
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
    console.log(`│ ├─ Loaded ${fetched.subcommands.length} subcommands and ${fetched.subcommandGroups.length} subcommand groups for ${name}`)
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
