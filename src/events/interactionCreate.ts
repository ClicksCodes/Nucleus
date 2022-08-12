import { callback as roleMenu } from "../actions/roleMenu.js";
import verify from "../reflex/verify.js";
import create from "../actions/tickets/create.js";
import close from "../actions/tickets/delete.js";
import createTranscript from "../premium/createTranscript.js";
import Fuse from "fuse.js";
import { autocomplete as tagAutocomplete } from "../commands/tag.js";
import type { AutocompleteInteraction, Interaction, MessageComponentInteraction } from "discord.js";
// @ts-expect-error
import type { HaikuClient } from "jshaiku";

export const event = "interactionCreate";

function getAutocomplete(typed: string, options: string[]): {name: string, value: string}[] {
    options = options.filter((option) => option.length <= 100); // thanks discord. 6000 character limit on slash command inputs but only 100 for autocomplete.
    if (!typed)
        return options
            .slice(0, 25)
            .sort()
            .map((option) => ({ name: option, value: option }));
    const fuse = new Fuse(options, {
        useExtendedSearch: true,
        findAllMatches: true,
        minMatchCharLength: 0
    }).search(typed);
    return fuse.slice(0, 25).map((option) => ({ name: option.item, value: option.item }));
}

function generateStatsChannelAutocomplete(typed: string) {
    const validReplacements = ["serverName", "memberCount", "memberCount:bots", "memberCount:humans"];
    const autocompletions = [];
    const beforeLastOpenBracket = typed.match(/(.*){[^{}]{0,15}$/);
    if (beforeLastOpenBracket !== null) {
        for (const replacement of validReplacements) {
            autocompletions.push(`${beforeLastOpenBracket[1]} {${replacement}}`);
        }
    } else {
        for (const replacement of validReplacements) {
            autocompletions.push(`${typed} {${replacement}}`);
        }
    }
    return getAutocomplete(typed, autocompletions);
}
function generateWelcomeMessageAutocomplete(typed: string) {
    const validReplacements = [
        "serverName",
        "memberCount",
        "memberCount:bots",
        "memberCount:humans",
        "member:mention",
        "member:name"
    ];
    const autocompletions = [];
    const beforeLastOpenBracket = typed.match(/(.*){[^{}]{0,15}$/);
    if (beforeLastOpenBracket !== null) {
        for (const replacement of validReplacements) {
            autocompletions.push(`${beforeLastOpenBracket[1]} {${replacement}}`);
        }
    } else {
        for (const replacement of validReplacements) {
            autocompletions.push(`${typed} {${replacement}}`);
        }
    }
    return getAutocomplete(typed, autocompletions);
}

async function interactionCreate(interaction: Interaction) {
    if (interaction.type === "MESSAGE_COMPONENT" && (interaction as MessageComponentInteraction).componentType === "BUTTON") {
        const int = (interaction as MessageComponentInteraction)
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
    } else if (interaction.type === "APPLICATION_COMMAND_AUTOCOMPLETE") {
        const int = (interaction as AutocompleteInteraction)
        switch (
            `${int.commandName} ${int.options.getSubcommandGroup(
                false
            )} ${int.options.getSubcommand(false)}`
        ) {
            case "tag null null": {
                return int.respond(
                    getAutocomplete(int.options.getString("tag") ?? "", await tagAutocomplete(int))
                );
            }
            case "settings null stats": {
                return int.respond(generateStatsChannelAutocomplete(int.options.getString("name") ?? ""));
            }
            case "settings null welcome": {
                return int.respond(
                    generateWelcomeMessageAutocomplete(int.options.getString("message") ?? "")
                );
            }
        }
    }
}

export async function callback(_client: HaikuClient, interaction: Interaction) {
    await interactionCreate(interaction);
}
