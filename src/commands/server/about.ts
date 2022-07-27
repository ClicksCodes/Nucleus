import Discord, { CommandInteraction, Guild, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import generateKeyValueList, { toCapitals } from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js"

const command = (builder: SlashCommandSubcommandBuilder) => builder
    .setName("about")
    .setDescription("Shows info about the server")

const callback = async (interaction: CommandInteraction): Promise<any> => {
    let guild = interaction.guild as Guild;
    const { renderUser, renderDelta } = client.logger
    interaction.reply({embeds: [new EmojiEmbed()
        .setTitle("Server Info")
        .setStatus("Success")
        .setEmoji("GUILD.GREEN")
        .setDescription(
            generateKeyValueList({
                "name": guild.name,
                "id": `\`${guild.id}\``,
                "owner": `${renderUser((await guild.fetchOwner()).user)}`,
                "created": `${renderDelta(guild.createdTimestamp)}`,
                "emojis": `${guild.emojis.cache.size}` + (guild.emojis.cache.size > 1 ? `\n> ${
                        guild.emojis.cache.first(10).map((emoji) => `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`).join(" ")
                    }` +
                    (guild.emojis.cache.size > 10 ? ` and ${guild.emojis.cache.size - 10} more` : ``) : ""),
                "icon": `[Discord](${guild.iconURL()})`,
                "2 factor authentication": `${guild.mfaLevel === "NONE" ? `${getEmojiByName("CONTROL.CROSS")} No` : `${getEmojiByName("CONTROL.TICK")} Yes`}`,
                "verification level": `${toCapitals(guild.verificationLevel)}`,
                "explicit content filter": `${toCapitals(guild.explicitContentFilter.toString().replace(/_/, " ", ))}`,
                "nitro boost level": `${guild.premiumTier !== "NONE" ? guild.premiumTier.toString()[-1] : "0"}`,
                "channels": `${guild.channels.cache.size}`,
                "roles": `${guild.roles.cache.size}`,
                "members": `${guild.memberCount}`,
            })
        )
        .setThumbnail(guild.iconURL({dynamic: true}))
    ], ephemeral: true});
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    return true;
}

export { command };
export { callback };
export { check };