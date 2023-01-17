import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows help for commands");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    interaction.reply({components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel("Create ticket")
            .setStyle(ButtonStyle.Primary)
            .setCustomId("createticket")
    )]}); // TODO: FINISH THIS FOR RELEASE
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
