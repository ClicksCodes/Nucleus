import { callback as roleMenu } from "../actions/roleMenu.js";
import verify from "../reflex/verify.js";
import create from "../actions/tickets/create.js";
import close from "../actions/tickets/delete.js";
import createTranscript from "../premium/createTranscript.js";

import type { ButtonInteraction, Interaction } from "discord.js";
import type Discord from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";

import { callback as banCallback, check as banCheck } from "../commands/mod/ban.js";
import { callback as kickCallback, check as kickCheck } from "../commands/mod/kick.js";
import { callback as muteCallback, check as muteCheck } from "../commands/mod/mute.js";
import { callback as nicknameCallback, check as nicknameCheck } from "../commands/mod/nick.js";
import { callback as warnCallback, check as warnCheck } from "../commands/mod/warn.js";

export const event = "interactionCreate";

async function errorMessage(interaction: ButtonInteraction, message: string) {
    await interaction.reply({
        embeds: [new EmojiEmbed().setDescription(message).setStatus("Danger")],
        ephemeral: true,
        components: []
    });
}

async function interactionCreate(interaction: Interaction) {
    if (interaction.isButton()) {
        switch (interaction.customId) {
            case "rolemenu": {
                return await roleMenu(interaction);
            }
            case "verifybutton": {
                return await verify(interaction);
            }
            case "createticket": {
                return await create(interaction);
            }
            case "closeticket": {
                return await close(interaction);
            }
            case "createtranscript": {
                return await createTranscript(interaction);
            }
            case "suggestionAccept": {
                return await modifySuggestion(interaction, true);
            }
            case "suggestionDeny": {
                return await modifySuggestion(interaction, false);
            }
        }
        // Mod actions
        if (interaction.customId.startsWith("mod:")) {
            const action = interaction.customId.split(":")[1];
            const memberId = interaction.customId.split(":")[2];
            const member = await interaction.guild?.members.fetch(memberId!);
            switch (action) {
                case "kick": {
                    const check = await kickCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await kickCallback(interaction, member);
                }
                case "ban": {
                    const check = await banCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await banCallback(interaction, member);
                }
                case "mute": {
                    const check = await muteCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await muteCallback(interaction, member);
                }
                case "nickname": {
                    const check = await nicknameCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check || "Something went wrong");
                    return await nicknameCallback(interaction, member);
                }
                case "warn": {
                    const check = await warnCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await warnCallback(interaction, member);
                }
            }
        }
    }
}

async function modifySuggestion(interaction: Discord.MessageComponentInteraction, accept: boolean) {
    const message = await interaction.message;
    await message.fetch();
    if (message.embeds.length === 0) return;
    const embed = message.embeds[0];
    const newcolor = accept ? "Success" : "Danger";
    const footer = {
        text: `Suggestion ${accept ? "accepted" : "denied"} by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
    };

    const newEmbed = new EmojiEmbed()
        .setTitle(embed!.title!)
        .setDescription(embed!.description!)
        .setFooter(footer)
        .setStatus(newcolor);

    await interaction.update({ embeds: [newEmbed], components: [] });
}

export async function callback(_client: NucleusClient, interaction: Interaction) {
    await interactionCreate(interaction);
}
