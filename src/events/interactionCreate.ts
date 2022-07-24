import { callback as roleMenu } from "../actions/roleMenu.js"
import verify from "../reflex/verify.js";
import create from "../actions/tickets/create.js";
import close from "../actions/tickets/delete.js";
import createTranscript from "../premium/createTranscript.js";

export const event = 'interactionCreate';

async function interactionCreate(interaction) {
    if (interaction.componentType === "BUTTON") {
        if (interaction.customId === "rolemenu") return await roleMenu(interaction)
        if (interaction.customId === "verifybutton") return verify(interaction)
        if (interaction.customId === "createticket") return create(interaction)
        if (interaction.customId === "closeticket") return close(interaction)
        if (interaction.customId === "createtranscript") return createTranscript(interaction)
    } else if (interaction.componentType === "MESSAGE_COMPONENT") {
        console.table(interaction)
    }
}

export async function callback(client, interaction) {
    await interactionCreate(interaction)
}