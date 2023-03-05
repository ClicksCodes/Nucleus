import { CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("invite").setDescription("Invites Nucleus to your server");

const callback = async (interaction: CommandInteraction): Promise<void> => {
    interaction.reply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Invite")
                .setDescription("You can invite Nucleus to your server by clicking the button below")
                .setEmoji("NUCLEUS.LOGO")
                .setStatus("Danger")
        ],
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder()
                    .setLabel("Invite")
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        `https://discord.com/api/oauth2/authorize?client_id=${
                            client.user!.id
                        }&permissions=295157886134&scope=bot%20applications.commands`
                    )
            ])
        ],
        ephemeral: true
    });
};

export { command };
export { callback };
