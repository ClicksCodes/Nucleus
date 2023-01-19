import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    Channel,
    CommandInteraction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    Role,
    ButtonStyle,
    AutocompleteInteraction,
    GuildChannel,
    EmbedBuilder
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import confirmationMessage from "../../utils/confirmationMessage.js";
import generateKeyValueList from "../../utils/generateKeyValueList.js";
import { ChannelType } from "discord-api-types/v9";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("welcome")
        .setDescription("Messages and roles sent or given when someone joins the server")
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("The message to send when someone joins the server")
                .setAutocomplete(true)
        )
        .addRoleOption((option) =>
            option.setName("role").setDescription("The role given when someone joins the server")
        )
        .addRoleOption((option) =>
            option.setName("ping").setDescription("The role pinged when someone joins the server")
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel the welcome message should be sent to")
                .addChannelTypes(ChannelType.GuildText)
        );

const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    const { renderRole, renderChannel, log, NucleusColors, entry, renderUser } = client.logger;
    await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    });
    let m: Message;
    if (
        interaction.options.get("role")?.role ||
        interaction.options.get("channel")?.channel ||
        interaction.options.get("message")?.value as string
    ) {
        let role: Role | null;
        let ping: Role | null;
        let channel: Channel | null;
        const message: string | null = interaction.options.get("message")?.value as string | null;
        try {
            role = interaction.options.get("role")?.role as Role | null;
            ping = interaction.options.get("ping")?.role as Role | null;
        } catch {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("GUILD.ROLES.DELETE")
                        .setTitle("Welcome Events")
                        .setDescription("The role you provided is not a valid role")
                        .setStatus("Danger")
                ]
            });
        }
        try {
            channel = interaction.options.get("channel")?.channel as Channel | null;
        } catch {
            return await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("GUILD.ROLES.DELETE")
                        .setTitle("Welcome Events")
                        .setDescription("The channel you provided is not a valid channel")
                        .setStatus("Danger")
                ]
            });
        }
        const options: {
            role?: string;
            ping?: string;
            channel?: string;
            message?: string;
        } = {};

        if (role) options.role = renderRole(role);
        if (ping) options.ping = renderRole(ping);
        if (channel) options.channel = renderChannel(channel as GuildChannel);
        if (message) options.message = "\n> " + message;
        const confirmation = await new confirmationMessage(interaction)
            .setEmoji("GUILD.ROLES.EDIT")
            .setTitle("Welcome Events")
            .setDescription(generateKeyValueList(options))
            .setColor("Warning")
            .setFailedMessage("No changes were made", "Success", "GUILD.ROLES.CREATE")
            .setInverted(true)
            .send(true);
        if (confirmation.cancelled) return;
        if (confirmation.success) {
            try {
                const toChange: {
                    "welcome.role"?: string;
                    "welcome.ping"?: string;
                    "welcome.channel"?: string;
                    "welcome.message"?: string;
                } = {};
                if (role) toChange["welcome.role"] = role.id;
                if (ping) toChange["welcome.ping"] = ping.id;
                if (channel) toChange["welcome.channel"] = channel.id;
                if (message) toChange["welcome.message"] = message;
                await client.database.guilds.write(interaction.guild!.id, toChange);
                const list: {
                    memberId: ReturnType<typeof entry>;
                    changedBy: ReturnType<typeof entry>;
                    role?: ReturnType<typeof entry>;
                    ping?: ReturnType<typeof entry>;
                    channel?: ReturnType<typeof entry>;
                    message?: ReturnType<typeof entry>;
                } = {
                    memberId: entry(interaction.user.id, `\`${interaction.user.id}\``),
                    changedBy: entry(interaction.user.id, renderUser(interaction.user))
                };
                if (role) list.role = entry(role.id, renderRole(role));
                if (ping) list.ping = entry(ping.id, renderRole(ping));
                if (channel) list.channel = entry(channel.id, renderChannel(channel as GuildChannel));
                if (message) list.message = entry(message, `\`${message}\``);
                const data = {
                    meta: {
                        type: "welcomeSettingsUpdated",
                        displayName: "Welcome Settings Changed",
                        calculateType: "nucleusSettingsUpdated",
                        color: NucleusColors.green,
                        emoji: "CONTROL.BLOCKTICK",
                        timestamp: new Date().getTime()
                    },
                    list: list,
                    hidden: {
                        guild: interaction.guild!.id
                    }
                };
                log(data);
            } catch (e) {
                console.log(e);
                return interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Welcome Events")
                            .setDescription("Something went wrong while updating welcome settings")
                            .setStatus("Danger")
                            .setEmoji("GUILD.ROLES.DELETE")
                    ],
                    components: []
                });
            }
        } else {
            return interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Welcome Events")
                        .setDescription("No changes were made")
                        .setStatus("Success")
                        .setEmoji("GUILD.ROLES.CREATE")
                ],
                components: []
            });
        }
    }
    let lastClicked = null;
    let timedOut = false;
    do {
        const config = await client.database.guilds.read(interaction.guild!.id);
        m = (await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Welcome Events")
                    .setDescription(
                        `**Message:** ${config.welcome.message ? `\n> ${config.welcome.message}` : "*None set*"}\n` +
                            `**Role:** ${
                                config.welcome.role
                                    ? renderRole((await interaction.guild!.roles.fetch(config.welcome.role))!)
                                    : "*None set*"
                            }\n` +
                            `**Ping:** ${
                                config.welcome.ping
                                    ? renderRole((await interaction.guild!.roles.fetch(config.welcome.ping))!)
                                    : "*None set*"
                            }\n` +
                            `**Channel:** ${
                                config.welcome.channel
                                    ? config.welcome.channel == "dm"
                                        ? "DM"
                                        : renderChannel((await interaction.guild!.channels.fetch(config.welcome.channel))!)
                                    : "*None set*"
                            }`
                    )
                    .setStatus("Success")
                    .setEmoji("CHANNEL.TEXT.CREATE")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel(lastClicked == "clear-message" ? "Click again to confirm" : "Clear Message")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setCustomId("clear-message")
                        .setDisabled(!config.welcome.message)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel(lastClicked == "clear-role" ? "Click again to confirm" : "Clear Role")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setCustomId("clear-role")
                        .setDisabled(!config.welcome.role)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel(lastClicked == "clear-ping" ? "Click again to confirm" : "Clear Ping")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setCustomId("clear-ping")
                        .setDisabled(!config.welcome.ping)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel(lastClicked == "clear-channel" ? "Click again to confirm" : "Clear Channel")
                        .setEmoji(getEmojiByName("CONTROL.CROSS", "id"))
                        .setCustomId("clear-channel")
                        .setDisabled(!config.welcome.channel)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel("Set Channel to DM")
                        .setCustomId("set-channel-dm")
                        .setDisabled(config.welcome.channel == "dm")
                        .setStyle(ButtonStyle.Secondary)
                ])
            ]
        })) as Message;
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id && i.channel!.id === interaction.channel!.id }
            });
        } catch (e) {
            timedOut = true;
            continue;
        }
        i.deferUpdate();
        if (i.customId == "clear-message") {
            if (lastClicked == "clear-message") {
                await client.database.guilds.write(interaction.guild!.id, {
                    "welcome.message": null
                });
                lastClicked = null;
            } else {
                lastClicked = "clear-message";
            }
        } else if (i.customId == "clear-role") {
            if (lastClicked == "clear-role") {
                await client.database.guilds.write(interaction.guild!.id, {
                    "welcome.role": null
                });
                lastClicked = null;
            } else {
                lastClicked = "clear-role";
            }
        } else if (i.customId == "clear-ping") {
            if (lastClicked == "clear-ping") {
                await client.database.guilds.write(interaction.guild!.id, {
                    "welcome.ping": null
                });
                lastClicked = null;
            } else {
                lastClicked = "clear-ping";
            }
        } else if (i.customId == "clear-channel") {
            if (lastClicked == "clear-channel") {
                await client.database.guilds.write(interaction.guild!.id, {
                    "welcome.channel": null
                });
                lastClicked = null;
            } else {
                lastClicked = "clear-channel";
            }
        } else if (i.customId == "set-channel-dm") {
            await client.database.guilds.write(interaction.guild!.id, {
                "welcome.channel": "dm"
            });
            lastClicked = null;
        }
    } while (!timedOut);
    await interaction.editReply({
        embeds: [new EmbedBuilder(m.embeds[0]!.data).setFooter({ text: "Message timed out" })],
        components: []
    });
};

const check = (interaction: CommandInteraction) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

const autocomplete = async (interaction: AutocompleteInteraction): Promise<string[]> => {
    const validReplacements = ["serverName", "memberCount:all", "memberCount:bots", "memberCount:humans"]
    if (!interaction.guild) return [];
    const prompt = interaction.options.getString("message");
    const autocompletions = [];
    if ( prompt === null ) {
        for (const replacement of validReplacements) {
            autocompletions.push(`{${replacement}}`);
        };
        return autocompletions;
    };
    const beforeLastOpenBracket = prompt.match(/(.*){[^{}]{0,15}$/);
    const afterLastOpenBracket = prompt.match(/{[^{}]{0,15}$/);
    if (beforeLastOpenBracket !== null) {
        if (afterLastOpenBracket !== null) {
            for (const replacement of validReplacements) {
                if (replacement.startsWith(afterLastOpenBracket[0]!.slice(1))) {
                    autocompletions.push(`${beforeLastOpenBracket[1]}{${replacement}}`);
                }
            }
        } else {
            for (const replacement of validReplacements) {
                autocompletions.push(`${beforeLastOpenBracket[1]}{${replacement}}`);
            }
        }
    } else {
        for (const replacement of validReplacements) {
            autocompletions.push(`${prompt} {${replacement}}`);
        }
    }
    return autocompletions;
};

export { command, callback, check, autocomplete };
