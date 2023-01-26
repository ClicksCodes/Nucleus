import type Discord from "discord.js";
import client from "./client.js";


export const getCommandMentionByName = async (name: string): Promise<string> => {
    const split = name.replaceAll("/", " ").split(" ")
    const commandName: string = split[0]!;

    const filterCommand = (command: Discord.ApplicationCommand) => command.name === commandName;

    const command = client.commandList!.filter(c => filterCommand(c))
    if (command.size === 0) return `\`/${name.replaceAll("/", " ")}\``;
    const commandID = command.first()!.id;
    return `</${split.join(" ")}:${commandID}>`;
}
