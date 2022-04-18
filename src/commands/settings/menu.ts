import { CommandInteraction, MessageEmbed, MessageSelectMenu } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import readConfig from "../../utils/readConfig.js";
import { toHexArray, toHexInteger, logs } from "../../utils/calculate.js"
import { capitalize } from "../../utils/generateKeyValueList.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("menu")
    .setDescription("Shows a full UI of all settings")

const callback = async (interaction: CommandInteraction) => {
    return
    let config = await readConfig(interaction.guild.id);

    let currentValues = toHexArray(config.logging.log.toLog);

    let toLogDropdownOptions = []

    for(let i of logs) {
        if(currentValues.includes(i)) {
            toLogDropdownOptions.push({
                name: capitalize(i),
                value: i,
                emoji: "TICK"
            })
        } else {
            toLogDropdownOptions.push({
                label: capitalize(i),
                value: i,
                emoji: "CROSS"
            })
        }
    }

    let toLogDropdown = new MessageSelectMenu()
        .setCustomId("log")
        .setMaxValues(22)
        .addOptions()

    let embed = new MessageEmbed()

    interaction.reply("This command is not yet finished [settings/all]");
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };