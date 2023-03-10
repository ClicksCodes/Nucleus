import {
    ActionRowBuilder,
    CommandInteraction,
    StringSelectMenuBuilder,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    StringSelectMenuOptionBuilder,
    SlashCommandBuilder,
    StringSelectMenuInteraction,
    ComponentType,
    APIMessageComponentEmoji,
    ApplicationCommandSubGroup,
    PermissionsBitField,
    Interaction,
    ApplicationCommandOption,
    ApplicationCommandSubCommand
} from "discord.js";
import client from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import { LoadingEmbed } from "../utils/defaults.js";
import { capitalize } from "../utils/generateKeyValueList.js";
import { getCommandByName, getCommandMentionByName } from "../utils/getCommandDataByName.js";
import getEmojiByName from "../utils/getEmojiByName.js";

const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows help for commands")
    .setDMPermission(true);

const styles: Record<string, { emoji: string }> = {
    help: { emoji: "NUCLEUS.LOGO" },
    mod: { emoji: "PUNISH.BAN.RED" },
    nucleus: { emoji: "NUCLEUS.LOGO" },
    privacy: { emoji: "NUCLEUS.LOGO" },
    role: { emoji: "GUILD.ROLES.DELETE" },
    rolemenu: { emoji: "GUILD.ROLES.DELETE" },
    server: { emoji: "GUILD.RED" },
    settings: { emoji: "GUILD.SETTINGS.RED" },
    tag: { emoji: "PUNISH.NICKNAME.RED" },
    tags: { emoji: "PUNISH.NICKNAME.RED" },
    ticket: { emoji: "GUILD.TICKET.CLOSE" },
    user: { emoji: "MEMBER.LEAVE" },
    verify: { emoji: "CONTROL.REDTICK" }
};

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const m = await interaction.reply({ embeds: LoadingEmbed, ephemeral: true, fetchReply: true });
    const commands = client.fetchedCommands;

    let closed = false;
    let currentPath: [string, string, string] = ["", "", ""];
    do {
        const commandRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("commandRow")
                .setPlaceholder("Select a command")
                .addOptions(
                    ...commands
                        .filter((command) => command.type === ApplicationCommandType.ChatInput)
                        .map((command) => {
                            const builder = new StringSelectMenuOptionBuilder()
                                .setLabel(capitalize(command.name))
                                .setValue(command.name)
                                .setDescription(command.description)
                                .setDefault(currentPath[0] === command.name);
                            if (styles[command.name])
                                builder.setEmoji(
                                    getEmojiByName(styles[command.name]!.emoji, "id") as APIMessageComponentEmoji
                                );
                            return builder;
                        })
                )
        );
        const subcommandGroupRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setCustomId("subcommandGroupRow")
        );
        const subcommandRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setCustomId("subcommandRow")
        );
        const embed = new EmojiEmbed().setTitle("Help").setStatus("Danger").setEmoji("NUCLEUS.LOGO");

        if (currentPath[0] === "" || currentPath[0] === "help") {
            embed.setDescription(
                `Welcome to Nucleus\n\n` +
                    `Select a command to get started${
                        (interaction.member?.permissions as PermissionsBitField).has("ManageGuild")
                            ? `, or run ${getCommandMentionByName("nucleus/guide")} for commands to set up your server`
                            : ``
                    }\n\n\n` +
                    `Nucleus is fully [open source](https://github.com/clicksminuteper/Nucleus), and all currently free features will remain free forever.\n\n` +
                    `You can invite Nucleus to your server using ${getCommandMentionByName("nucleus/invite")}\n` +
                    `Our support server can be found [here](https://discord.gg/bPaNnxe), and we can be emailed at support@clicks.codes`
            );
        } else {
            const currentData = getCommandByName(
                currentPath.filter((value) => value !== "" && value !== "none").join("/")
            );
            const current = commands.find((command) => command.name === currentPath[0])!;

            let optionString = ``;
            let options: (ApplicationCommandOption & {
                nameLocalized?: string;
                descriptionLocalized?: string;
            })[] = [];
            //options
            if (
                currentPath[1] !== "" &&
                currentPath[1] !== "none" &&
                currentPath[2] !== "" &&
                currentPath[2] !== "none"
            ) {
                const Op = current.options.find(
                    (option) => option.name === currentPath[1]
                )! as ApplicationCommandSubGroup;
                const Op2 = Op.options!.find((option) => option.name === currentPath[2])!;
                options = Op2.options ?? [];
            } else if (currentPath[1] !== "" && currentPath[1] !== "none") {
                let Op = current.options.find((option) => option.name === currentPath[1])!;
                if (Op.type === ApplicationCommandOptionType.SubcommandGroup) {
                    options = [];
                } else {
                    Op = Op as ApplicationCommandSubCommand;
                    options = Op.options ?? [];
                }
            } else {
                options = current.options.filter(
                    (option) =>
                        option.type !== ApplicationCommandOptionType.SubcommandGroup &&
                        option.type !== ApplicationCommandOptionType.Subcommand
                );
            }
            for (const option of options) {
                optionString += ` - \`${option.name}\` (${ApplicationCommandOptionType[option.type]
                    .replace("Integer", "Number")
                    .replace("String", "Text")}) - ${option.description}\n`;
            }
            const APICommand =
                client.commands[
                    "commands/" + currentPath.filter((value) => value !== "" && value !== "none").join("/")
                ]![0];
            let allowedToRun = true;
            if (interaction.guild && APICommand?.check) {
                allowedToRun = await APICommand.check(interaction as Interaction, true);
            }
            embed.setDescription(
                `${getEmojiByName(styles[currentPath[0]]!.emoji)} **${capitalize(currentData.name)}** | ${
                    currentData.mention
                }\n\n` +
                    `${currentData.description}\n\n` +
                    (APICommand
                        ? `${getEmojiByName(allowedToRun ? "CONTROL.TICK" : "CONTROL.CROSS")} You ${
                              allowedToRun ? "" : "don't "
                          }` + `have permission to use this command\n\n`
                        : "") +
                    (optionString.length > 0 ? "**Options:**\n" + optionString : "")
            );
            const subcommands = current.options.filter(
                (option) => option.type === ApplicationCommandOptionType.Subcommand
            );
            const subcommandGroups = current.options.filter(
                (option) => option.type === ApplicationCommandOptionType.SubcommandGroup
            );

            if (subcommandGroups.length > 0) {
                subcommandGroupRow.components[0]!.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Select a subcommand")
                        .setValue("none")
                        .setDefault(currentPath[1] === "none"),
                    ...subcommandGroups.map((option) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(capitalize(option.name))
                            .setValue(option.name)
                            .setDefault(currentPath[1] === option.name)
                    )
                );
                if (
                    subcommandGroupRow.components[0]!.options.find(
                        (option) => option.data.default && option.data.value !== "none"
                    )
                ) {
                    const subsubcommands =
                        (
                            subcommandGroups.find(
                                (option) => option.name === currentPath[1]
                            )! as ApplicationCommandSubGroup
                        ).options ?? [];
                    subcommandRow.components[0]!.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Select a subcommand")
                            .setValue("none")
                            .setDefault(currentPath[2] === "none"),
                        ...subsubcommands.map((option) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(capitalize(option.name))
                                .setValue(option.name)
                                .setDefault(currentPath[2] === option.name)
                        )
                    );
                }
            }
            if (subcommands.length > 0) {
                subcommandGroupRow.components[0]!.addOptions(
                    ...subcommands.map((option) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(capitalize(option.name))
                            .setValue(option.name)
                            .setDefault(currentPath[1] === option.name)
                    )
                );
            }
        }

        const cmps = [commandRow];
        if (subcommandGroupRow.components[0]!.options.length > 0) cmps.push(subcommandGroupRow);
        if (subcommandRow.components[0]!.options.length > 0) cmps.push(subcommandRow);

        await interaction.editReply({ embeds: [embed], components: cmps });

        let i: StringSelectMenuInteraction;
        try {
            i = await m.awaitMessageComponent<ComponentType.StringSelect>({
                filter: (newInteraction) => interaction.user.id === newInteraction.user.id,
                time: 300000
            });
        } catch (e) {
            closed = true;
            continue;
        }
        await i.deferUpdate();
        const value = i.values[0]!;
        switch (i.customId) {
            case "commandRow": {
                currentPath = [value, "", ""];
                break;
            }
            case "subcommandGroupRow": {
                currentPath = [currentPath[0], value, ""];
                break;
            }
            case "subcommandRow": {
                currentPath[2] = value;
                break;
            }
        }
    } while (!closed);
};

export { command as command };
export { callback };
