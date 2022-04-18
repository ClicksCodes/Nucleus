import { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import generateEmojiEmbed from "../../utils/generateEmojiEmbed.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("invite")
    .setDescription("Invites Nucleus to your server")

const callback = (interaction: CommandInteraction) => {
    interaction.reply({embeds: [new generateEmojiEmbed()
        .setTitle("Invite")
        .setDescription("You can invite Nucleus to your server by clicking the button below")
        .setEmoji("NUCLEUS.LOGO")
        .setStatus("Danger")
    ], components: [new MessageActionRow().addComponents([new MessageButton()
        .setLabel("Invite")
        .setStyle("LINK")
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=295157886134&scope=bot%20applications.commands`)
    ])], ephemeral: true});
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };