import { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, ApplicationCommand, ApplicationCommandOptionType } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import client from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import { LoadingEmbed } from "../utils/defaults.js";

const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows help for commands");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const m = await interaction.reply({ embeds: LoadingEmbed, fetchReply: true });
    const commands = client.fetchedCommands;

    const commandRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            commands.map((command) => {
                return new StringSelectMenuBuilder()
                    .setCustomId(command.name)
                    .setPlaceholder("Select a command")
                    .addOptions({
                        label: command.name,
                        value: command.name
                    })
            })
        );

    let closed = false;
    do {
        let current: ApplicationCommand | undefined;
        const subcommandGroupRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("subcommandGroupRow")
            );
        const subcommandRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("subcommandRow")
            );
        const embed = new EmojiEmbed()
            .setTitle("Help")
            .setStatus("Success")
            .setEmoji("📖")

        if(!current) {
            embed.setDescription(
                `**${"Help Menu Home"}**\n\n` +
                `${"Select a command to get started"}`
            )
        } else {
            embed.setDescription(
                `**${current.name}**\n\n` +
                `${current.description}`
            )
            if(current.options.filter((option) => option.type === ApplicationCommandOptionType.SubcommandGroup).length > 0) {
                subcommandGroupRow.components[0]!
                    .addOptions(
                        current.options.filter((option) => option.type === ApplicationCommandOptionType.SubcommandGroup).map((option) => {
                            return {
                                label: option.name,
                                value: option.name
                            }
                        })
                    )
            } else {
                if(current.options.filter((option) => option.type === ApplicationCommandOptionType.Subcommand).length > 0) {
                    subcommandRow.components[0]!
                        .addOptions(
                            current.options.filter((option) => option.type === ApplicationCommandOptionType.Subcommand).map((option) => {
                                return {
                                    label: option.name,
                                    value: option.name
                                }
                            })
                        )
                }
            }
        }
        let cmps = [commandRow];
        if(subcommandGroupRow.components[0]!.options.length > 0) cmps.push(subcommandGroupRow);
        if(subcommandRow.components[0]!.options.length > 0) cmps.push(subcommandRow);

        await interaction.editReply({ embeds: [embed], components: cmps });

    } while (!closed);
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
