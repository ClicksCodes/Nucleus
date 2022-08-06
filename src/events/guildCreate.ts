import type { Guild } from "discord.js";
// @ts-expect-error
import type { HaikuClient } from "jshaiku";
import guide from "../reflex/guide.js";

export const event = "guildCreate";

export async function callback(_client: HaikuClient, guild: Guild) {
    guide(guild);
}
