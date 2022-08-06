import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
// @ts-expect-error
import { WrappedCheck } from "jshaiku";
import verify from "../reflex/verify.js";

const command = new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Get verified in the server");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    verify(interaction);
};

const check = (
    _interaction: CommandInteraction,
    _defaultCheck: WrappedCheck
) => {
    return true;
};

export { command };
export { callback };
export { check };
