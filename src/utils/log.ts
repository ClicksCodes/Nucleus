import * as Discord from "discord.js";
import getEmojiByName from "./getEmojiByName.js";
import { toHexArray } from "./calculate.js";
import { promisify } from "util";
import generateKeyValueList from "./generateKeyValueList.js";
import client from "./client.js";

const wait = promisify(setTimeout);


export const Logger = {
    renderUser(user: Discord.User | string) {
        if (typeof user === "string") return `${user} [<@${user}>]`;
        return `${user.username} [<@${user.id}>]`;
    },
    renderTime(t: number) {
        t = Math.floor((t /= 1000));
        return `<t:${t}:D> at <t:${t}:T>`;
    },
    renderDelta(t: number) {
        t = Math.floor((t /= 1000));
        return `<t:${t}:R> (<t:${t}:D> at <t:${t}:T>)`;
    },
    renderNumberDelta(num1: number, num2: number) {
        const delta = num2 - num1;
        return `${num1} -> ${num2} (${delta > 0 ? "+" : ""}${delta})`;
    },
    entry(value: string | number | null, displayValue: string): { value: string | null; displayValue: string } {
        return { value: value, displayValue: displayValue };
    },
    renderChannel(channel: Discord.GuildChannel | Discord.ThreadChannel) {
        return `${channel.name} [<#${channel.id}>]`;
    },
    renderRole(role: Discord.Role) {
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
    async getAuditLog(guild: Discord.Guild, event: Discord.GuildAuditLogsResolvable): Promise<Discord.GuildAuditLogsEntry[]> {
        await wait(250);
        const auditLog = (await guild.fetchAuditLogs({ type: event })).entries.map(m => m)
        return auditLog as Discord.GuildAuditLogsEntry[];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async log(log: any): Promise<void> {
        const config = await client.database.guilds.read(log.hidden.guild);
        if (!config.logging.logs.enabled) return;
        if (!toHexArray(config.logging.logs.toLog).includes(log.meta.calculateType)) {
            console.log("Not logging this type of event");
            return;
        }
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
                log.separate = log.separate || {};
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
    }
};


export default {};
