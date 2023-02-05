import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";
import { LoadingEmbed } from "../../utils/defaults.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("premium").setDescription("Information about Nucleus Premium");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    await interaction.reply({embeds: LoadingEmbed, ephemeral: true})
    const member = await (await interaction.client.guilds.fetch("684492926528651336")).members.fetch(interaction.user.id)
    const firstDescription = "\n\nPremium allows your server to get access to extra features, for a fixed price per month.\nThis includes:\n" +
        "- Attachment logs - Stores attachments so they can be viewed after a message is deleted.\n" +
        "- Ticket Transcripts - Gives a link to view the history of a ticket after it has been closed.\n"
    if(!member) {
        interaction.editReply({ embeds: [
            new EmojiEmbed()
                .setTitle("Premium")
                .setDescription(
                    `*You are not currently in the Clicks Server. To gain access to premium please join.*` + firstDescription
                )
                .setEmoji("NUCLEUS.LOGO")
                .setStatus("Danger")
        ], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Join").setURL("https://discord.gg/bPaNnxe"))] });
        return;
    }
    const dbMember = await client.database.premium.fetchUser(interaction.user.id)
    let premium = `You do not have premium! You can't activate premium on any servers.`;
    let count = 0;
    const {level, appliesTo} = dbMember || {level: 0, appliesTo: []}
    if (level === 99) {
        premium = `You have Infinite Premium! You have been gifted this by the developers as a thank you. You can give premium to any and all servers you are in.`;
        count = 200;
    } else if (level === 1) {
        premium = `You have Premium tier 1! You can give premium to ${1 - appliesTo.length} more servers.`;
        count = 1;
    } else if (level === 2) {
        premium = `You have Premium tier 2! You can give premium to ${3 - appliesTo.length} more servers.`;
        count = 3;
    } else if (level === 3) {
        premium = `You have Premium Mod! You can give premium to ${3 - appliesTo.length} more servers, as well as automatically giving premium to all servers you have a "manage" permission in.`
        count = 3;
    }
    const hasPremium = await client.database.premium.hasPremium(interaction.guild!.id);
    let premiumGuild = ""
    if (hasPremium) {
        premiumGuild = `\n\n**This server has premium!**`
    }

    let closed = false;
    do {
        interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setTitle("Premium")
                    .setDescription(
                        premium + firstDescription + premiumGuild
                    )
                    .setEmoji("NUCLEUS.LOGO")
                    .setStatus("Danger")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Primary)
                            .setLabel("Activate Premium here")
                            .setCustomId("premiumActivate")
                            .setDisabled(count <= 0 && hasPremium)
                    )
            ]
        });

        const filter = (i: any) => i.customId === "premiumActivate" && i.user.id === interaction.user.id;
        let i;
        try {
            i = await interaction.channel!.awaitMessageComponent({ filter, time: 60000 });
        } catch (e) {
            return;
        }
        i.deferUpdate();
        const guild = i.guild!;
        if (count - appliesTo.length <= 0) {
            interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Premium")
                        .setDescription(
                            `You have already activated premium on the maximum amount of servers!` + firstDescription
                        )
                        .setEmoji("NUCLEUS.PREMIUMACTIVATE")
                        .setStatus("Danger")
                ],
                components: []
            });
            closed = true;
        } else {
            client.database.premium.addPremium(interaction.user.id, guild.id);
            interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Premium")
                        .setDescription(
                            `You have activated premium on this server!` + firstDescription
                        )
                        .setEmoji("NUCLEUS.LOGO")
                        .setStatus("Danger")
                ],
                components: []
            });
            closed = true;
        }

    } while (!closed);
};

export { command };
export { callback };
