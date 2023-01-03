import { callback as roleMenu } from "../actions/roleMenu.js";
import verify from "../reflex/verify.js";
import create from "../actions/tickets/create.js";
import close from "../actions/tickets/delete.js";
import createTranscript from "../premium/createTranscript.js";

import type { Interaction, MessageComponentInteraction } from "discord.js";
import type { NucleusClient } from "../utils/client.js";

export const event = "interactionCreate";


async function interactionCreate(interaction: Interaction) {
    if (interaction.isButton()) {
        const int = interaction as MessageComponentInteraction;
        switch (int.customId) {
            case "rolemenu": {
                return await roleMenu(interaction);
            }
            case "verifybutton": {
                return verify(int);
            }
            case "createticket": {
                return create(interaction);
            }
            case "closeticket": {
                return close(interaction);
            }
            case "createtranscript": {
                return createTranscript(int);
            }
        }
    // } else if (interaction.type === "APPLICATION_COMMAND_AUTOCOMPLETE") {
    //     const int = interaction as AutocompleteInteraction;
    //     switch (`${int.commandName} ${int.options.getSubcommandGroup(false)} ${int.options.getSubcommand(false)}`) {
    //         case "tag null null": {
    //             return int.respond(getAutocomplete(int.options.getString("tag") ?? "", await tagAutocomplete(int)));
    //         }
    //         case "settings null stats": {
    //             return int.respond(generateStatsChannelAutocomplete(int.options.getString("name") ?? ""));
    //         }
    //         case "settings null welcome": {
    //             return int.respond(generateWelcomeMessageAutocomplete(int.options.getString("message") ?? ""));
    //         }
    //     }
    }
}

export async function callback(_client: NucleusClient, interaction: Interaction) {
    await interactionCreate(interaction);
}
