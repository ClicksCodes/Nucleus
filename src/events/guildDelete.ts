import client, { NucleusClient } from "../utils/client.js";
import type { Guild } from "discord.js";

export const event = "guildDelete";
export const callback = async (_client: NucleusClient, guild: Guild) => {
    await client.database.guilds.delete(guild.id);
    await client.database.history.delete(guild.id);
    await client.database.notes.delete(guild.id);
    await client.database.transcripts.deleteAll(guild.id);
};
