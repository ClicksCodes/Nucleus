import Discord, { Interaction, Message, MessageComponentInteraction } from "discord.js";
import client from "./client.js";

export default async function (
    m: Message,
    interactionFilter: (i: MessageComponentInteraction) => boolean | Promise<boolean>,
    messageFilter: (m: Message) => boolean | Promise<boolean>
) {
    let out;
    try {
        out = await new Promise((resolve, _reject) => {
            const mes = m
                .createMessageComponentCollector({
                    filter: (m) => interactionFilter(m),
                    time: 300000
                })
                .on("collect", (m) => {
                    resolve(m);
                });
            const int = m.channel
                .createMessageCollector({
                    filter: (m) => messageFilter(m),
                    time: 300000
                })
                .on("collect", (m) => {
                    try {
                        m.delete();
                    } catch (e) {
                        client._error(e);
                    }
                    resolve(m);
                });
            mes.on("end", () => {
                int.stop();
            });
            int.on("end", () => {
                mes.stop();
            });
        });
    } catch (e) {
        console.log(e);
        return null;
    }

    return out;
}

export async function modalInteractionCollector(
    m: Message,
    modalFilter: (i: Interaction) => boolean | Promise<boolean>,
    interactionFilter: (i: MessageComponentInteraction) => boolean | Promise<boolean>
): Promise<null | Interaction> {
    let out: Interaction;
    try {
        out = await new Promise((resolve, _reject) => {
            const int = m
                .createMessageComponentCollector({
                    filter: (i: MessageComponentInteraction) => interactionFilter(i),
                    time: 300000
                })
                .on("collect", (i: Interaction) => {
                    resolve(i);
                });
            const mod = new Discord.InteractionCollector(client, {
                filter: (i: Interaction) => modalFilter(i),
                time: 300000
            }).on("collect", async (i: Interaction) => {
                int.stop();
                (i as Discord.ModalSubmitInteraction).deferUpdate();
                resolve(i as Discord.ModalSubmitInteraction);
            });
            int.on("end", () => {
                mod.stop();
            });
            mod.on("end", () => {
                int.stop();
            });
        });
    } catch (e) {
        console.log(e);
        return null;
    }
    return out;
}
