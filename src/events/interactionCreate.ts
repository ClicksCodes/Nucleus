import { callback as roleMenu } from "../actions/roleMenu.js";
import verify from "../reflex/verify.js";
import create from "../actions/tickets/create.js";
import close from "../actions/tickets/delete.js";
import createTranscript from "../premium/createTranscript.js";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Interaction,
    InteractionEditReplyOptions,
    ModalBuilder,
    ModalSubmitInteraction,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import type { NucleusClient } from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";

import { callback as banCallback, check as banCheck } from "../commands/mod/ban.js";
import { callback as kickCallback, check as kickCheck } from "../commands/mod/kick.js";
import { callback as muteCallback, check as muteCheck } from "../commands/mod/mute.js";
import { callback as nicknameCallback, check as nicknameCheck } from "../commands/mod/nick.js";
import { callback as warnCallback, check as warnCheck } from "../commands/mod/warn.js";
import { callback as logDetailsCallback } from "../actions/logs/showDetails.js";
import client from "../utils/client.js";

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
        if (interaction.customId.endsWith(":Suggestion")) {
            const value =
                interaction.customId.startsWith("accept") || interaction.customId.startsWith("implement")
                    ? true
                    : false;
            return await modifySuggestion(interaction, value);
        }
        if (interaction.customId === "log:edit") {
            const attachment = interaction.message.embeds[0]?.image;
            console.log(attachment)
            if (!attachment) return;
            const attachmentData = await (await fetch(attachment.url)).text()
            console.log(attachmentData)
            const decoded = atob(attachmentData);
            console.log("decoded", decoded)
            const json = JSON.parse(decoded);
            console.log("json", json)
        }
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
            case "log:showDetails": {
                return await logDetailsCallback(interaction);
            }
        }
        // Mod actions
        if (interaction.customId.startsWith("mod:")) {
            const action = interaction.customId.split(":")[1];
            const memberId = interaction.customId.split(":")[2];
            const member = await interaction.guild?.members.fetch(memberId!);
            switch (action) {
                case "kick": {
                    const check = kickCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await kickCallback(interaction, member);
                }
                case "ban": {
                    const check = banCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await banCallback(interaction, member);
                }
                case "mute": {
                    const check = muteCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await muteCallback(interaction, member);
                }
                case "nickname": {
                    const check = nicknameCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check || "Something went wrong");
                    return await nicknameCallback(interaction, member);
                }
                case "warn": {
                    const check = warnCheck(interaction, false, member);
                    if (check !== true) return await errorMessage(interaction, check!);
                    return await warnCallback(interaction, member);
                }
            }
        }
    }
}

const getReason = async (buttonInteraction: ButtonInteraction, prompt: string) => {
    const modal = new ModalBuilder()
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setStyle(TextInputStyle.Paragraph).setLabel(prompt).setCustomId("typed")
            )
        )
        .setTitle("Reason")
        .setCustomId("modal");
    await buttonInteraction.showModal(modal);
    let out: ModalSubmitInteraction;
    try {
        out = await buttonInteraction.awaitModalSubmit({
            filter: (i) => i.customId === "modal" && i.user.id === buttonInteraction.user.id,
            time: 300000
        });
    } catch {
        return null;
    }
    await out.deferUpdate();
    return out.fields.getTextInputValue("typed");
};

async function modifySuggestion(interaction: ButtonInteraction, accept: boolean) {
    const message = interaction.message;
    await message.fetch();
    if (message.embeds.length === 0) return;
    const embed = message.embeds[0]!;
    const issueNum = embed.footer!.text;
    if (!issueNum) return;
    const issue = {
        owner: "ClicksMinutePer",
        repo: "Nucleus",
        issue_number: parseInt(issueNum)
    };
    let name = "Unknown";
    const components: InteractionEditReplyOptions["components"] = [];
    switch (interaction.customId) {
        case "accept:Suggestion": {
            name = "Accepted";
            await interaction.deferUpdate();
            await client.GitHub.rest.issues.createComment({
                ...issue,
                body: "Suggestion accepted by " + interaction.user.tag
            });
            components.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("close:Suggestion")
                        .setLabel("Close")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("implemented:Suggestion")
                        .setLabel("Implemented")
                        .setStyle(ButtonStyle.Secondary)
                )
            );
            break;
        }
        case "deny:Suggestion": {
            name = "Denied";
            const reason = await getReason(interaction, "Reason for denial");
            await client.GitHub.rest.issues.createComment({
                ...issue,
                body: "Suggestion denied by " + interaction.user.tag + " for reason:\n>" + reason
            });
            await client.GitHub.rest.issues.update({ ...issue, state: "closed", state_reason: "not_planned" });
            // await client.GitHub.rest.issues.lock({...issue, lock_reason: "resolved"})
            components.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("lock:Suggestion").setLabel("Lock").setStyle(ButtonStyle.Danger)
                )
            );
            break;
        }
        case "close:Suggestion": {
            name = "Closed";
            const reason = await getReason(interaction, "Reason for closing");
            await client.GitHub.rest.issues.createComment({
                ...issue,
                body: "Suggestion closed by " + interaction.user.tag + " for reason:\n>" + reason
            });
            await client.GitHub.rest.issues.update({ ...issue, state: "closed" });
            // await client.GitHub.rest.issues.lock({...issue})
            components.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("lock:Suggestion").setLabel("Lock").setStyle(ButtonStyle.Danger)
                )
            );
            break;
        }
        case "implement:Suggestion": {
            name = "Implemented";
            await interaction.deferUpdate();
            await client.GitHub.rest.issues.createComment({ ...issue, body: "Suggestion implemented" });
            await client.GitHub.rest.issues.update({ ...issue, state: "closed", state_reason: "completed" });
            await client.GitHub.rest.issues.lock({ ...issue, lock_reason: "resolved" });
            break;
        }
        case "lock:Suggestion": {
            name = "Locked";
            await interaction.deferUpdate();
            await client.GitHub.rest.issues.lock({ ...issue });
            break;
        }
        case "spam:Suggestion": {
            name = "Marked as Spam";
            await interaction.deferUpdate();
            await client.GitHub.rest.issues.update({ ...issue, state: "closed", state_reason: "not_planned" });
            await client.GitHub.rest.issues.lock({ ...issue, lock_reason: "spam" });
            break;
        }
    }

    const newcolor = accept ? "Success" : "Danger";
    const newEmoji = accept ? "ICONS.ADD" : "ICONS.OPP.ADD";

    const newEmbed = new EmojiEmbed()
        .setEmoji(newEmoji)
        .setTitle(embed!.title!.replace(/.+> /, ""))
        .setDescription(embed!.description!)
        .setFields({
            name: name + " by",
            value: interaction.user.tag
        })
        .setStatus(newcolor)
        .setFooter(embed!.footer);

    await interaction.editReply({
        embeds: [newEmbed],
        components: components
    });
}

export async function callback(_client: NucleusClient, interaction: Interaction) {
    await interactionCreate(interaction);
}
