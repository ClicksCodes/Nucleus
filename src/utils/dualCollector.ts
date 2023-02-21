import { ButtonInteraction, Client, User, Interaction, InteractionCollector, Message, MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";
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
            const int = m.channel.createMessageCollector({
                    filter: (m) => messageFilter(m),
                    time: 300000
                })
                .on("collect", (m) => {
                    try {
                        m.delete();
                    } catch (e) {
                        client.emit("error", e as Error);
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

function defaultInteractionFilter(i: MessageComponentInteraction, user: User, m: Message) {
    return i.channel!.id === m.channel!.id && i.user.id === user.id
}
function defaultModalFilter(i: ModalSubmitInteraction, user: User, m: Message) {
    return i.channel!.id === m.channel!.id && i.user.id === user.id
}


export async function modalInteractionCollector(
    m: Message, user: User,
    modalFilter?: (i: Interaction) => boolean | Promise<boolean>,
    interactionFilter?: (i: MessageComponentInteraction) => boolean | Promise<boolean>
): Promise<null | ButtonInteraction | ModalSubmitInteraction> {
    let out: ButtonInteraction | ModalSubmitInteraction;
    try {
        out = await new Promise((resolve, _reject) => {
            const int = m
                .createMessageComponentCollector({
                    filter: (i: MessageComponentInteraction) => (interactionFilter ? interactionFilter(i) : true) && defaultInteractionFilter(i, user, m),
                    time: 300000
                })
                .on("collect", async (i: ButtonInteraction) => {
                    mod.stop();
                    int.stop();
                    await i.deferUpdate();
                    resolve(i);
                });
            const mod = new InteractionCollector(client as Client, {
                filter: (i: Interaction) => (modalFilter ? modalFilter(i) : true) && i.isModalSubmit() && defaultModalFilter(i, user, m),
                time: 300000
            }).on("collect", async (i: ModalSubmitInteraction) => {
                int.stop();
                mod.stop();
                await i.deferUpdate();
                resolve(i);
            });
        });
    } catch (e) {
        console.log(e);
        return null;
    }
    return out;
}
