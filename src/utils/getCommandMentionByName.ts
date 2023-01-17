import type Discord from "discord.js";
import client from "./client.js";
import config from "../config/main.json" assert { type: "json"};


export const getCommandMentionByName = async (name: string): Promise<string> => {
    const split = name.replaceAll("/", " ").split(" ")
    const commandName: string = split[0]!;
    let commandID: string;

    const filterCommand = (command: Discord.ApplicationCommand) => command.name === commandName;

    if (config.enableDevelopment) {
        const developmentGuild = client.guilds.cache.get(config.developmentGuildID)!;
        await developmentGuild.commands.fetch();
        commandID = developmentGuild.commands.cache.filter(c => filterCommand(c)).first()!.id;
    } else {
        await client.application?.commands.fetch();
        commandID = client.application?.commands.cache.filter(c => filterCommand(c)).first()!.id!;
    }
    return `</${split.join(" ")}:${commandID}>`;
}