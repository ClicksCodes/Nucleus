import { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";

const command = new SlashCommandBuilder()
    .setName("createtestbutton")
    .setDescription("creates a test button") // TODO: remove for release

const callback = (interaction: CommandInteraction) => {
    interaction.reply({components: [new MessageActionRow().addComponents([
        new MessageButton()
            .setCustomId("createticket")
            .setLabel("Create Ticket")
            .setStyle("PRIMARY")
            .setDisabled(false),
        new MessageButton()
            .setCustomId("verifybutton")
            .setLabel("Verify")
            .setStyle("PRIMARY")
            .setDisabled(false),
        new MessageButton()
            .setCustomId("rolemenu")
            .setLabel("Get roles")
            .setStyle("PRIMARY")
            .setDisabled(false)
    ])]});
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };