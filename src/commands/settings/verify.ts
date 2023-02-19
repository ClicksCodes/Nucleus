import { LoadingEmbed } from "../../utils/defaults.js";
import Discord, {
    CommandInteraction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    RoleSelectMenuBuilder,
    APIMessageComponentEmoji
} from "discord.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import type { SlashCommandSubcommandBuilder } from "discord.js";
import client from "../../utils/client.js";
import { getCommandMentionByName } from "../../utils/getCommandDataByName.js";
import lodash from "lodash";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("verify")
        .setDescription("Manage the role given after a user runs /verify")


const callback = async (interaction: CommandInteraction): Promise<unknown> => {
    if (!interaction.guild) return;
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        ephemeral: true,
        fetchReply: true
    })) as Message;

    let closed = false;
    let config = await client.database.guilds.read(interaction.guild.id);
    let data = Object.assign({}, config.verify);
    do {
        const selectMenu = new ActionRowBuilder<RoleSelectMenuBuilder>()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId("role")
                .setPlaceholder("Select a role")
        );

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("switch")
                    .setLabel(data.enabled ? "Enabled" : "Disabled")
                    .setStyle(data.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(getEmojiByName(data.enabled ? "CONTROL.TICK" : "CONTROL.CROSS", "id") as APIMessageComponentEmoji),
                new ButtonBuilder()
                    .setCustomId("save")
                    .setLabel("Save")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(getEmojiByName("ICONS.SAVE", "id") as APIMessageComponentEmoji)
                    .setDisabled(lodash.isEqual(config.verify, data))
            );

        const embed = new EmojiEmbed()
            .setTitle("Verify Role")
            .setDescription(
                `Select a role to be given to users after they run ${getCommandMentionByName("verify")}` +
                `\n\nCurrent role: ${config.verify.role ? `<@&${config.verify.role}>` : "None"}`
            )
            .setStatus("Success")
            .setEmoji("CHANNEL.TEXT.CREATE");

        await interaction.editReply({
            embeds: [embed],
            components: [selectMenu, buttons]
        });

        let i;
        try {
            i = await m.awaitMessageComponent({
                time: 300000,
                filter: (i) => { return i.user.id === interaction.user.id }
            });
        } catch (e) {
            closed = true;
            continue;
        }

        await i.deferUpdate();

        if(i.isButton()) {
            switch (i.customId) {
                case "save": {
                    client.database.guilds.write(interaction.guild.id, {"verify": data} )
                    config = await client.database.guilds.read(interaction.guild.id);
                    data = Object.assign({}, config.verify);
                    break
                }
                case "switch": {
                    data.enabled = !data.enabled;
                    break
                }
            }
        } else {
            data.role = i.values[0]!;
        }

    } while (!closed);
    await interaction.deleteReply()
};

const check = (interaction: CommandInteraction, _partial: boolean = false) => {
    const member = interaction.member as Discord.GuildMember;
    if (!member.permissions.has("ManageGuild"))
        return "You must have the *Manage Server* permission to use this command";
    return true;
};

export { command };
export { callback };
export { check };
