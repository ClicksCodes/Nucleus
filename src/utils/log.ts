import * as Discord from "discord.js";
import getEmojiByName from "./getEmojiByName.js";
import { toHexArray } from "./calculate.js";
import { promisify } from "util";
import generateKeyValueList from "./generateKeyValueList.js";
import client from "./client.js";
import {DiscordAPIError} from "discord.js";

const wait = promisify(setTimeout);

export interface LoggerOptions {
    meta: {
        type: string;
        displayName: string;
        calculateType: string;
        color: number;
        emoji: string;
        timestamp: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list: any;
    hidden: {
        guild: string;
    };
    separate?: {
        start?: string;
        end?: string;
    };
}

async function isLogging(guild: string, type: string): Promise<boolean> {
    const config = await client.database.guilds.read(guild);
    if (!config.logging.logs.enabled) return false;
    if (!config.logging.logs.channel) return false;
    if (!toHexArray(config.logging.logs.toLog).includes(type)) {
        return false;
    }
    return true;
}

export const Logger = {
    renderUser(user: Discord.User | string) {
        if (typeof user === "string") user = client.users.cache.get(user)!;
        return `${user.username} [<@${user.id}>]`;
    },
    renderTime(t: number) {
        if(isNaN(t)) return "Unknown"
        t = Math.floor((t /= 1000));
        return `<t:${t}:D> at <t:${t}:T>`;
    },
    renderDelta(t: number) {
        if(isNaN(t)) return "Unknown"
        t = Math.floor((t /= 1000));
        return `<t:${t}:R> (<t:${t}:D> at <t:${t}:T>)`;
    },
    renderNumberDelta(num1: number, num2: number) {
        const delta = num2 - num1;
        return `${num1} -> ${num2} (${delta > 0 ? "+" : ""}${delta})`;
    },
    entry(
        value: string | number | boolean | null | (string | boolean)[],
        displayValue: string
    ): { value: string | boolean | null | (string | boolean | number)[]; displayValue: string } {
        if (typeof value === "number") value = value.toString();
        return { value: value, displayValue: displayValue };
    },
    renderChannel(channel: Discord.GuildChannel | Discord.ThreadChannel | string) {
        if (typeof channel === "string")
            channel = client.channels.cache.get(channel) as Discord.GuildChannel | Discord.ThreadChannel;
        return `${channel.name} [<#${channel.id}>]`;
    },
    renderRole(role: Discord.Role | string, guild?: Discord.Guild | string) {
        if (typeof role === "string")
            role = (typeof guild === "string" ? client.guilds.cache.get(guild) : guild)!.roles.cache.get(role)!;
        return `${role.name} [<@&${role.id}>]`;
    },
    renderEmoji(emoji: Discord.GuildEmoji) {
        return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}> [\`:${emoji.name}:\`]`;
    },
    NucleusColors: {
        red: 0xf27878,
        yellow: 0xf2d478,
        green: 0x68d49e
    },
    async getAuditLog(
        guild: Discord.Guild,
        event: Discord.GuildAuditLogsResolvable,
        delay?: number
    ): Promise<Discord.GuildAuditLogsEntry[]> {
        if (!guild.members.me?.permissions.has("ViewAuditLog")) return [];
        await wait(delay ?? 250);
        try {
            const auditLog = (await guild.fetchAuditLogs({ type: event })).entries.map((m) => m);
            return auditLog as Discord.GuildAuditLogsEntry[];
        } catch (e) {
            if (e instanceof DiscordAPIError) return [];
            throw e;
        }
    },
    async log(log: LoggerOptions): Promise<void> {
        if (!(await isLogging(log.hidden.guild, log.meta.calculateType))) return;
        console.log(log.hidden.guild);
        const config = await client.database.guilds.read(log.hidden.guild);
        console.log(config.logging.logs.channel);

        if (config.logging.logs.channel) {
            const channel = (await client.channels.fetch(config.logging.logs.channel)) as Discord.TextChannel | null;
            const description: Record<string, string> = {};
            Object.entries(log.list).map((entry) => {
                const key: string = entry[0];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const value: any = entry[1];
                if (value.displayValue) {
                    description[key] = value.displayValue;
                } else {
                    description[key] = value;
                }
            });
            if (channel) {
                log.separate = log.separate ?? {};
                const embed = new Discord.EmbedBuilder()
                    .setTitle(`${getEmojiByName(log.meta.emoji)} ${log.meta.displayName}`)
                    .setDescription(
                        (log.separate.start ? log.separate.start + "\n" : "") +
                            generateKeyValueList(description) +
                            (log.separate.end ? "\n" + log.separate.end : "")
                    )
                    .setTimestamp(log.meta.timestamp)
                    .setColor(log.meta.color);
                channel.send({ embeds: [embed] });
            }
        }
    },
    isLogging
};

export default {};
