import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows help for commands");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    interaction.reply({components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel("Verify")
            .setStyle(ButtonStyle.Primary)
            .setCustomId("verifybutton")
    )]}); // TODO: FINISH THIS FOR RELEASE
};

const check = (_interaction: CommandInteraction) => {
    return true;
};

export { command };
export { callback };
export { check };
