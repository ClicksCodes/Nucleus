import type { SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { SlashCommandBuilder } from "discord.js";
import config from "../../config/main.json" assert { type: "json" };
import getSubcommandsInFolder from "./getFilesInFolder.js";
import client from "../client.js";
import Discord from "discord.js";


const colours = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    none: "\x1b[0m"
}


export async function group(
    name: string,
    description: string,
    path: string,
    nameLocalizations?: Record<string, string>,
    descriptionLocalizations?: Record<string, string>
) {
    // If the name of the command does not match the path (e.g. attachment.ts has /attachments), use commandString
    console.log(`│  ├─ Loading group ${name}`)
    const fetched = await getSubcommandsInFolder(config.commandsFolder + "/" + path, "│  ")
    console.log(`│  │  └─ ${fetched.errors ? colours.red : colours.green}Loaded ${fetched.subcommands.length} subcommands for ${name} (${fetched.errors} failed)${colours.none}`)
    return (subcommandGroup: SlashCommandSubcommandGroupBuilder) => {
        subcommandGroup
            .setName(name)
            .setDescription(description)
        if (nameLocalizations) { subcommandGroup.setNameLocalizations(nameLocalizations) }
        if (descriptionLocalizations) { subcommandGroup.setDescriptionLocalizations(descriptionLocalizations) }

        for (const subcommand of fetched.subcommands) {
            subcommandGroup.addSubcommand(subcommand.command);
        };

        return subcommandGroup;
    };
}

export async function command(
    name: string,
    description: string,
    path: string,
    commandString: string | undefined = undefined,
    nameLocalizations?: Record<string, string>,
    descriptionLocalizations?: Record<string, string>,
    userPermissions?: Discord.PermissionsString[],
    allowedInDMs?: boolean
) {
    // If the name of the command does not match the path (e.g. attachment.ts has /attachments), use commandString
    commandString = "commands/" + (commandString ?? path);
    const fetched = await getSubcommandsInFolder(config.commandsFolder + "/" + path);
    console.log(`│  ├─ ${fetched.errors ? colours.red : colours.green}Loaded ${fetched.subcommands.length} subcommands and ${fetched.subcommandGroups.length} subcommand groups for ${name} (${fetched.errors} failed)${colours.none}`)
    return (command: SlashCommandBuilder) => {
        command.setName(name)
        command.setDescription(description)
        command.setNameLocalizations(nameLocalizations ?? {})
        command.setDescriptionLocalizations(descriptionLocalizations ?? {})
        command.setDMPermission(allowedInDMs ?? false)
        if (userPermissions) {
            const bitfield = new Discord.PermissionsBitField()
                bitfield.add(userPermissions)
            command.setDefaultMemberPermissions(bitfield.bitfield)
        }
        client.commands[commandString!] = [undefined, { name: name, description: description }]

        for (const subcommand of fetched.subcommands) {
            let fetchedCommand;
            if (subcommand.command instanceof Function) {
                fetchedCommand = subcommand.command(new Discord.SlashCommandSubcommandBuilder());
            } else {
                fetchedCommand = subcommand.command;
            }
            client.commands[commandString! + "/" + fetchedCommand.name] = [subcommand, { name: fetchedCommand.name, description: fetchedCommand.description }]
            command.addSubcommand(fetchedCommand);
        }
        for (const group of fetched.subcommandGroups) {
            command.addSubcommandGroup(group.command);
            client.commands[commandString! + "/" + group.command.name] = [undefined, { name: group.command.name, description: group.command.description }]
        };
        return command;
    };
}
