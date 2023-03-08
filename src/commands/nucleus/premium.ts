import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CommandInteraction,
    ComponentType,
    Message,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import { LoadingEmbed } from "../../utils/defaults.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("premium").setDescription("Information about Nucleus Premium");
//TODO: Allow User to remove Premium

const dmcallback = async (interaction: CommandInteraction, firstDescription: string, msg: Message): Promise<void> => {
    let closed = false;
    do {
        const dbUser = await client.database.premium.fetchUser(interaction.user.id);
        if (!dbUser) {
            await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Premium")
                        .setDescription(
                            `*You do not have premium! You can't activate premium on any servers.*` + firstDescription
                        )
                        .setEmoji("NUCLEUS.LOGO")
                        .setStatus("Danger")
                ]
            });
            return;
        }
        const premiumGuilds = dbUser.appliesTo.map((guildID) => {
            const guild = client.guilds.cache.get(guildID);
            if (!guild) return undefined;
            return guild.name;
        });

        const options = premiumGuilds.filter((guild) => guild !== undefined) as string[];

        const removeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("currentPremium")
                .setPlaceholder("Select a server to remove premium from")
                .setDisabled(premiumGuilds.length === 0)
                .addOptions(
                    options.slice(0, Math.min(options.length, 24)).map((guild) => {
                        return { label: guild, value: guild };
                    })
                )
        );
        const cancel = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("cancel").setLabel("Close").setStyle(ButtonStyle.Danger)
        );

        const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [cancel];
        if (options.length > 0) components.unshift(removeRow);
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Premium")
                    .setDescription(
                        `*You have premium on the following servers:*\n\n` +
                            (options.length > 0 ? options.join(", ") : `You have not activated premium in any guilds`) +
                            firstDescription
                    )
                    .setEmoji("NUCLEUS.LOGO")
                    .setStatus("Success")
            ],
            components: components
        });

        let i: StringSelectMenuInteraction | ButtonInteraction;
        try {
            const filter = (i: StringSelectMenuInteraction | ButtonInteraction) => i.user.id === interaction.user.id;
            i = await msg.awaitMessageComponent<ComponentType.StringSelect | ComponentType.Button>({
                time: 300000,
                filter
            });
        } catch (e) {
            await interaction.deleteReply();
            closed = true;
            break;
        }
        await i.deferUpdate();
        if (i.isButton()) {
            closed = true;
        } else {
            const response = await client.database.premium.removePremium(interaction.user.id, i.values[0]!);
            console.log(response);
        }
    } while (!closed);
    await interaction.deleteReply();
};

const callback = async (interaction: CommandInteraction): Promise<void> => {
    if (interaction.guild) client.database.premium.hasPremium(interaction.guild.id).finally(() => {});
    const m = await interaction.reply({ embeds: LoadingEmbed, ephemeral: true, fetchReply: true });
    const member = await (await interaction.client.guilds.fetch("684492926528651336")).members
        .fetch(interaction.user.id)
        .catch(() => {
            void interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Premium")
                        .setDescription(
                            `*You are not currently in the Clicks Server. To gain access to premium please join.*` +
                                firstDescription
                        )
                        .setEmoji("NUCLEUS.LOGO")
                        .setStatus("Danger")
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Join")
                            .setURL("https://discord.gg/bPaNnxe")
                    )
                ]
            });
        });
    if (!member) return;
    const firstDescription =
        "\n\nPremium allows servers of your choice to get access to extra features for a fixed price per month.\nThis includes:\n" +
        `${getEmojiByName(
            "MOD.IMAGES.TOOSMALL"
        )}  Attachment logs - Stores attachments so they can be viewed after a message is deleted.\n` +
        `${getEmojiByName(
            "GUILD.TICKET.ARCHIVED"
        )}  Ticket Transcripts - Gives a link to view the history of a ticket after it has been closed.\n`;
    const dbMember = await client.database.premium.fetchUser(interaction.user.id);
    let premium = `You do not have premium! You can't activate premium on any servers.`;
    let count = 0;
    const { level, appliesTo } = dbMember ?? { level: 0, appliesTo: [] };
    if (level === 99) {
        premium = `You have Infinite Premium! You have been gifted this by the developers as a thank you. You can give premium to any and all servers you are in.`;
        count = 200;
    } else if (level === 1) {
        premium = `You have Premium tier 1! You can give premium to ${1 - appliesTo.length} more server(s).`;
        count = 1;
    } else if (level === 2) {
        premium = `You have Premium tier 2! You can give premium to ${3 - appliesTo.length} more server(s).`;
        count = 3;
    } else if (level === 3) {
        premium = `You have Premium Mod! You can give premium to ${
            3 - appliesTo.length
        } more server(s), as well as automatically giving premium to all servers you have a "manage" permission in.`;
        count = 3;
    }
    if (dbMember?.expiresAt) {
        premium = `**You can't give servers premium anymore because your subscription ended or was cancelled.** To get premium again please subscribe in the Clicks server`;
        count = 0;
    }
    if (!interaction.guild) return await dmcallback(interaction, firstDescription, m);
    const hasPremium = await client.database.premium.hasPremium(interaction.guild!.id);
    let premiumGuild = "";
    if (hasPremium) {
        const gaveUser = await client.users.fetch(hasPremium[1]);
        premiumGuild = `**This server has premium! It was ${
            hasPremium[2] === 3 && hasPremium[3]
                ? `automatically applied by ${gaveUser.username}#${gaveUser.discriminator}`
                : `given by <@${hasPremium[1]}>`
        }**\n\n`;
    }

    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (level === 0 || dbMember?.expiresAt) {
        components.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Join Clicks")
                    .setURL("https://discord.gg/bPaNnxe")
            )
        );
    } else {
        components.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(premiumGuild.length > 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setLabel(premiumGuild.length > 0 ? "This server has premium" : "Activate premium here")
                    .setCustomId("premiumActivate")
                    .setDisabled(count <= 0 || (hasPremium ? hasPremium[0] : false))
            )
        );
    }

    let userPremiumServers = "";
    if ((dbMember?.appliesTo.length ?? 0) > 0)
        userPremiumServers = "\nIf you want to remove premium from a server, run this command in your DMs with me.";

    await interaction.editReply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Premium")
                .setDescription(premiumGuild + premium + firstDescription)
                .setEmoji("NUCLEUS.LOGO")
                .setStatus("Danger")
                .setImage("https://assets.clicks.codes/ads/ads/nucleus-premium.png")
        ],
        components: components
    });

    const filter = (i: ButtonInteraction) => i.customId === "premiumActivate" && i.user.id === interaction.user.id;
    let i;
    try {
        i = await interaction.channel!.awaitMessageComponent<2>({ filter, time: 60000 });
    } catch (e) {
        return;
    }
    await i.deferUpdate();
    const guild = i.guild!;
    if (count - appliesTo.length <= 0) {
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Premium")
                    .setDescription(
                        `You have already activated premium on the maximum amount of servers!` +
                            userPremiumServers +
                            firstDescription
                    )
                    .setEmoji("NUCLEUS.PREMIUMACTIVATE")
                    .setStatus("Danger")
            ],
            components: []
        });
    } else {
        await client.database.premium.addPremium(interaction.user.id, guild.id);
        await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Premium")
                    .setDescription(
                        `You have activated premium on this server!` + userPremiumServers + firstDescription
                    )
                    .setEmoji("NUCLEUS.LOGO")
                    .setStatus("Danger")
            ],
            components: []
        });
    }
};

export { command };
export { callback };
