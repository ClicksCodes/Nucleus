import Discord from 'discord.js';
import client from './client.js';
import generateEmojiEmbed from "./generateEmojiEmbed.js";

export default async function (m, interactionFilter, messageFilter) {
    let out;
    try {
        out = await new Promise((resolve, reject) => {
            let mes, int;
            mes = m.createMessageComponentCollector({filter: (m) => interactionFilter(m), time: 600000})
                .on("collect", (m) => { resolve(m); })
            int = m.channel.createMessageCollector({filter: (m) => messageFilter(m), time: 600000})
                .then("collect", (m) => { try {m.delete();} catch {}; resolve(m); })
            mes.on("end", () => { int.stop(); })
            int.on("end", () => { mes.stop(); })
        })
    } catch(e) {
        console.log(e)
        return null;
    }

    return out;
}

export async function modalInteractionCollector(m, modalFilter, interactionFilter) {
    let out;
    try {
        out = await new Promise((resolve, reject) => {
            let mod, int;
            int = m.createMessageComponentCollector({filter: (m) => interactionFilter(m), time: 600000})
                .on("collect", (m) => { resolve(m); })
            mod = new Discord.InteractionCollector(
                client, {
                    filter: (m) => modalFilter(m),
                    time: 600000
                })
                .on("collect", async (m) => {
                    int.stop();
                    (m as Discord.ModalSubmitInteraction).deferUpdate()
                    resolve((m as Discord.ModalSubmitInteraction)); })
            int.on("end", () => { mod.stop(); })
            mod.on("end", () => { int.stop(); })
        })
    } catch(e) {
        console.log(e)
        return null;
    }
    return out;
}