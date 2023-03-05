import type Discord from "discord.js";
import client from "./client.js";

export const getCommandMentionByName = (name: string): string => {
    const split = name.replaceAll("/", " ").split(" ");
    const commandName: string = split[0]!;

    const filterCommand = (command: Discord.ApplicationCommand) => command.name === commandName;

    const command = client.fetchedCommands.filter((c) => filterCommand(c));
    if (command.size === 0) return `\`/${name.replaceAll("/", " ")}\``;
    const commandID = command.first()!.id;
    return `</${split.join(" ")}:${commandID}>`;
};

export const getCommandByName = (name: string): { name: string; description: string; mention: string } => {
    const split = name.replaceAll(" ", "/");
    const command = client.commands["commands/" + split]!;
    // console.log(command)
    const mention = getCommandMentionByName(name);
    return {
        name: command[1].name,
        description: command[1].description,
        mention: mention
    };
};
