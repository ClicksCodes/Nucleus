import type { Guild } from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import guide from "../reflex/guide.js";

export const event = "guildCreate";

export async function callback(_client: NucleusClient, guild: Guild) {
    await guide(guild);
}
