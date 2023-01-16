import { callback as roleMenu } from "../actions/roleMenu.js";
import verify from "../reflex/verify.js";
import create from "../actions/tickets/create.js";
import close from "../actions/tickets/delete.js";
import createTranscript from "../premium/createTranscript.js";

import type { Interaction } from "discord.js";
import type Discord from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";

export const event = "interactionCreate";


async function interactionCreate(interaction: Interaction) {
    if (interaction.isButton()) {
        switch (interaction.customId) {
            case "rolemenu":         { return await roleMenu(interaction); }
            case "verifybutton":     { return await verify(interaction); }
            case "createticket":     { return await create(interaction); }
            case "closeticket":      { return await close(interaction); }
            case "createtranscript": { return await createTranscript(interaction); }
            case "suggestionAccept": { return await modifySuggestion(interaction, true); }
            case "suggestionDeny":   { return await modifySuggestion(interaction, false); }
        }
    }
}

async function modifySuggestion(interaction: Discord.MessageComponentInteraction, accept: boolean) {
    const message = await interaction.message;
    await message.fetch();
    if (message.embeds.length === 0) return;
    const embed = message.embeds[0];
    const newColour = accept ? "Success" : "Danger";
    const footer = {text: `Suggestion ${accept ? "accepted" : "denied"} by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL()};

    const newEmbed = new EmojiEmbed()
        .setTitle(embed!.title!)
        .setDescription(embed!.description!)
        .setFooter(footer)
        .setStatus(newColour);

    await interaction.update({embeds: [newEmbed], components: []});
}

export async function callback(_client: NucleusClient, interaction: Interaction) {
    await interactionCreate(interaction);
}
