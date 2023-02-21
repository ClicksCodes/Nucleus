import { SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { SlashCommandBuilder } from "discord.js";
import config from "../../config/main.js";
import getSubcommandsInFolder from "./getFilesInFolder.js";
import client from "../client.js";
import Discord from "discord.js";


const colors = {
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
    console.log(`│  │  └─ ${fetched.errors ? colors.red : colors.green}Loaded ${fetched.subcommands.length} subcommands for ${name} (${fetched.errors} failed)${colors.none}`)
    return (subcommandGroup: SlashCommandSubcommandGroupBuilder) => {
        subcommandGroup
            .setName(name)
            .setDescription(description)
        if (nameLocalizations) { subcommandGroup.setNameLocalizations(nameLocalizations) }
        if (descriptionLocalizations) { subcommandGroup.setDescriptionLocalizations(descriptionLocalizations) }

        for (const subcommand of fetched.subcommands) {
            const processedCommand = subcommand.command(new SlashCommandSubcommandBuilder());
            client.commands["commands/" + path + "/" + processedCommand.name] = [subcommand, { name: processedCommand.name, description: processedCommand.description }]
            subcommandGroup.addSubcommand(processedCommand);
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
    console.log(`│  ├─ ${fetched.errors ? colors.red : colors.green}Loaded ${fetched.subcommands.length} subcommands and ${fetched.subcommandGroups.length} subcommand groups for ${name} (${fetched.errors} failed)${colors.none}`)
    // console.log({name: name, description: description})
    client.commands[commandString!] = [undefined, { name: name, description: description }]
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

        for (const subcommand of fetched.subcommands) {
            let fetchedCommand;
            if (subcommand.command instanceof Function) {
                fetchedCommand = subcommand.command(new SlashCommandSubcommandBuilder());
            } else {
                fetchedCommand = subcommand.command;
            }
            client.commands[commandString! + "/" + fetchedCommand.name] = [subcommand, { name: fetchedCommand.name, description: fetchedCommand.description }]
            command.addSubcommand(fetchedCommand);
        }
        for (const group of fetched.subcommandGroups) {
            const processedCommand = group.command(new SlashCommandSubcommandGroupBuilder());
            client.commands[commandString! + "/" + processedCommand.name] = [undefined, { name: processedCommand.name, description: processedCommand.description }]
            command.addSubcommandGroup(processedCommand);
        };
        return command;
    };
}
