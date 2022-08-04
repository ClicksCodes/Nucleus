import type { Guild } from "discord.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { HaikuClient } from "jshaiku";
import guide from "../reflex/guide.js";

export const event = "guildCreate";

export async function callback(_client: HaikuClient, guild: Guild) {
    guide(guild);
}
