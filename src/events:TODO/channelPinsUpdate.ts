import log from '../utils/log.js'
import * as JsonDiff from 'json-diff'

export const name = ''
export const once = false
export async function execute(channel) {
    let pins = (await channel.messages.fetchPinned()).map(m => m.id);
    let oldPins = require(`../data/guilds/${channel.guild.id}/pins.json`);

    let data = JsonDiff.diff(oldPins, pins, {full: true});

    addLog(channel.guild.id, data)
}
