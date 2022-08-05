import Discord, { Interaction } from "discord.js";
import client from "./client.js";

export default async function (m, interactionFilter, messageFilter) {
    let out;
    try {
        out = await new Promise((resolve, _reject) => {
            const mes = m.createMessageComponentCollector({filter: (m) => interactionFilter(m), time: 300000})
                .on("collect", (m) => { resolve(m); });
            const int = m.channel.createMessageCollector({filter: (m) => messageFilter(m), time: 300000})
                .then("collect", (m) => { try {m.delete();} catch (e) { client._error(e); } resolve(m); });
            mes.on("end", () => { int.stop(); });
            int.on("end", () => { mes.stop(); });
        });
    } catch(e) {
        console.log(e);
        return null;
    }

    return out;
}

export async function modalInteractionCollector(m, modalFilter, interactionFilter) {
    let out;
    try {
        out = await new Promise((resolve, _reject) => {
            const int = m.createMessageComponentCollector({filter: (m: Interaction) => interactionFilter(m), time: 300000})
                .on("collect", (m: Interaction) => { resolve(m); });
            const mod = new Discord.InteractionCollector(
                client, {
                    filter: (m: Interaction) => modalFilter(m),
                    time: 300000
                })
                .on("collect", async (m: Interaction) => {
                    int.stop();
                    (m as Discord.ModalSubmitInteraction).deferUpdate();
                    resolve((m as Discord.ModalSubmitInteraction)); });
            int.on("end", () => { mod.stop(); });
            mod.on("end", () => { int.stop(); });
        });
    } catch(e) {
        console.log(e);
        return null;
    }
    return out;
}