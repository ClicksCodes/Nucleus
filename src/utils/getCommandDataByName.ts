import type Discord from "discord.js";
import client from "./client.js";

/**
* @param name The name of the command, not including a leading slash. This can be space or slash separated e.g. "mod/about" or "mod about"
* @returns A string which when put into Discord will mention the command if the command exists or a codeblock with the command name if it does not
*
* @throws Will throw an error if as empty string is passed
**/
export const getCommandMentionByName = (name: string): string => {
    const split = name.replaceAll("/", " ").split(" ");
    const commandName: string | undefined = split[0];
    if (commandName === undefined) throw new RangeError(`Invalid command ${name} provided to getCommandByName`);

    const filterCommand = (command: Discord.ApplicationCommand) => command.name === commandName;

    const command = client.fetchedCommands.filter((c) => filterCommand(c));
    const commandID = command.first()?.id;

    if (commandID === undefined) return `\`/${name.replaceAll("/", " ")}\``;

    return `</${split.join(" ")}:${commandID}>`;
};

/**
* @param name The name of the command, not including a leading slash. This can be space or slash separated e.g. "mod/about" or "mod about"
* @returns An object containing the command name, the command description and a string which when put into Discord will mention the command
*
* @throws Will throw an error if the command doesn't exist
* @throws Will throw an error if as empty string is passed
**/
export const getCommandByName = (name: string): { name: string; description: string; mention: string } => {
    const split = name.replaceAll(" ", "/");
    const command = client.commands["commands/" + split];

    if (command === undefined) throw new RangeError(`Invalid command ${name} provided to getCommandByName`);

    const mention = getCommandMentionByName(name);
    return {
        name: command[1].name,
        description: command[1].description,
        mention: mention
    };
};
