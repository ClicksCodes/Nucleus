import * as fs from 'fs';
import * as Discord from 'discord.js';
import getEmojiByName from './getEmojiByName.js';
import { toHexArray } from './calculate.js';
import { promisify } from 'util';
import generateKeyValueList from './generateKeyValueList.js';
import client from './client.js';

const wait = promisify(setTimeout);


export class Logger {
    renderUser(user: Discord.User | string) {
        if (typeof user === 'string') return `${user} [<@${user}>]`;
        return `${user.username} [<@${user.id}>]`;
    }
    renderTime(t: number) {
        t = Math.floor(t /= 1000)
        return `<t:${t}:D> at <t:${t}:T>`;
    }
    renderDelta(t: number) {
        t = Math.floor(t /= 1000)
        return `<t:${t}:R> (<t:${t}:D> at <t:${t}:T>)`;
    }
    renderNumberDelta(num1, num2) {
        let delta = num2 - num1;
        return `${num1} -> ${num2} (${delta > 0 ? '+' : ''}${delta})`;
    }
    entry(value, displayValue) {
        return { value: value, displayValue: displayValue }
    }
    renderChannel(channel: Discord.GuildChannel | Discord.ThreadChannel) {
        return `${channel.name} [<#${channel.id}>]`;
    }
    renderRole(role: Discord.Role) {
        return `${role.name} [<@&${role.id}>]`;
    }
    renderEmoji(emoji: Discord.GuildEmoji) {
        return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}> [\`:${emoji.name}:\`]`;
    }

    public readonly NucleusColors = {
        red: 0xF27878,
        yellow: 0xF2D478,
        green: 0x68D49E,

    }

    async getAuditLog(guild: Discord.Guild, event): Promise<Discord.GuildAuditLogsEntry[]>{
        await wait(250)
        let auditLog = await guild.fetchAuditLogs({type: event});
        return auditLog as unknown as Discord.GuildAuditLogsEntry[];
    }

    async log(log: any): Promise<void> {
        let config = await client.database.guilds.read(log.hidden.guild);
        if (!config.logging.logs.enabled) return;
        if (!(log.meta.calculateType === true)) {
            if(!toHexArray(config.logging.logs.toLog).includes(log.meta.calculateType)) return console.log('Not logging this type of event');
        }
        if (config.logging.logs.channel) {
            let channel = await client.channels.fetch(config.logging.logs.channel) as Discord.TextChannel;
            let description = {};
            Object.entries(log.list).map(entry => {
                let key = entry[0];
                let value:any = entry[1];
                if(value.displayValue) {
                    description[key] = value.displayValue;
                } else {
                    description[key] = value;
                }
            })
            if (channel) {
                log.separate = log.separate || {};
                let embed = new Discord.MessageEmbed()
                    .setTitle(`${getEmojiByName(log.meta.emoji)} ${log.meta.displayName}`)
                    .setDescription(
                        (log.separate.start ? log.separate.start + "\n" : "") +
                        generateKeyValueList(description) +
                        (log.separate.end ? "\n" + log.separate.end : "")
                    )
                    .setTimestamp(log.meta.timestamp)
                    .setColor(log.meta.color);
                channel.send({embeds: [embed]});
            }
        }
    }
}


export default {}
