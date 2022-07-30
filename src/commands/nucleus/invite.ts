import { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import client from "../../utils/client.js"

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("invite")
    .setDescription("Invites Nucleus to your server")

const callback = async (interaction: CommandInteraction): Promise<any> => {
    interaction.reply({embeds: [new EmojiEmbed()
        .setTitle("Invite")
        .setDescription("You can invite Nucleus to your server by clicking the button below")
        .setEmoji("NUCLEUS.LOGO")
        .setStatus("Danger")
    ], components: [new MessageActionRow().addComponents([new MessageButton()
        .setLabel("Invite")
        .setStyle("LINK")
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=295157886134&scope=bot%20applications.commands`)
    ])], ephemeral: true});
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };