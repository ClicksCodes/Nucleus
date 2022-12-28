import type { Guild } from "discord.js";
import type { HaikuClient } from "../utils/haiku/index.js";
import guide from "../reflex/guide.js";

export const event = "guildCreate";

export async function callback(_client: HaikuClient, guild: Guild) {
    guide(guild);
}
