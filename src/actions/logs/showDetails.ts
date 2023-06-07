import { type ButtonInteraction } from "discord.js";

export async function callback(interaction: ButtonInteraction) {
    console.log(interaction);
}
