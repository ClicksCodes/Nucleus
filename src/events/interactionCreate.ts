import { callback as roleMenu } from "../actions/roleMenu.js";
import verify from "../reflex/verify.js";
import create from "../actions/tickets/create.js";
import close from "../actions/tickets/delete.js";
import createTranscript from "../premium/createTranscript.js";
import Fuse from "fuse.js";
import { autocomplete as tagAutocomplete } from "../commands/tag.js";

export const event = "interactionCreate";


function getAutocomplete(typed: string, options: string[]): object[] {
    options = options.filter(option => option.length <= 100); // thanks discord. 6000 character limit on slash command inputs but only 100 for autocomplete.
    if (!typed) return options.slice(0, 25).sort().map(option => ({name: option, value: option}));
    const fuse = new Fuse(options, {useExtendedSearch: true, findAllMatches: true, minMatchCharLength: 0}).search(typed);
    return fuse.slice(0, 25).map(option => ({name: option.item, value: option.item}));
}

function generateStatsChannelAutocomplete(typed) {
    const validReplacements = ["serverName", "memberCount", "memberCount:bots", "memberCount:humans"];
    const autocompletions = [];
    const beforeLastOpenBracket = typed.match(/(.*){[^{}]{0,15}$/);
    if (beforeLastOpenBracket !== null) { for (const replacement of validReplacements) { autocompletions.push(`${beforeLastOpenBracket[1]} {${replacement}}`); } }
    else { for (const replacement of validReplacements) { autocompletions.push(`${typed} {${replacement}}`); } }
    return getAutocomplete(typed, autocompletions);
}
function generateWelcomeMessageAutocomplete(typed) {
    const validReplacements = ["serverName", "memberCount", "memberCount:bots", "memberCount:humans", "member:mention", "member:name"];
    const autocompletions = [];
    const beforeLastOpenBracket = typed.match(/(.*){[^{}]{0,15}$/);
    if (beforeLastOpenBracket !== null) { for (const replacement of validReplacements) { autocompletions.push(`${beforeLastOpenBracket[1]} {${replacement}}`); } }
    else { for (const replacement of validReplacements) { autocompletions.push(`${typed} {${replacement}}`); } }
    return getAutocomplete(typed, autocompletions);
}

async function interactionCreate(interaction) {
    if (interaction.componentType === "BUTTON") {
        switch (interaction.customId) {
        case "rolemenu": { return await roleMenu(interaction); }
        case "verifybutton": { return verify(interaction); }
        case "createticket": { return create(interaction); }
        case "closeticket": { return close(interaction); }
        case "createtranscript": { return createTranscript(interaction); }
        }
    } else if (interaction.type === "APPLICATION_COMMAND_AUTOCOMPLETE") {
        switch (`${interaction.commandName} ${interaction.options.getSubcommandGroup(false)} ${interaction.options.getSubcommand(false)}`) {
        case "tag null null": { return interaction.respond(getAutocomplete(interaction.options.getString("tag"), (await tagAutocomplete(interaction)))); }
        case "settings null stats": { return interaction.respond(generateStatsChannelAutocomplete(interaction.options.getString("name"))); }
        case "settings null welcome": { return interaction.respond(generateWelcomeMessageAutocomplete(interaction.options.getString("message"))); }
        }
    }
}

export async function callback(client, interaction) {
    await interactionCreate(interaction);
}