import { callback as roleMenu } from "../automations/roleMenu.js"
import verify from "../automations/verify.js";
import create from "../automations/tickets/create.js";
import close from "../automations/tickets/delete.js";

export const event = 'interactionCreate';

async function interactionCreate(interaction) {
    if (interaction.componentType === "BUTTON") {
        if (interaction.customId === "rolemenu") return await roleMenu(interaction)
        if (interaction.customId === "verifybutton") return verify(interaction)
        if (interaction.customId === "createticket") return create(interaction)
        if (interaction.customId === "closeticket") return close(interaction)
    } else if (interaction.componentType === "MESSAGE_COMPONENT") {
        console.table(interaction)
    }
}

export async function callback(client, interaction) {
    await interactionCreate(interaction)
}