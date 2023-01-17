import { CommandInteraction, GuildMFALevel } from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import generateKeyValueList, { toCapitals } from "../../utils/generateKeyValueList.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder.setName("about").setDescription("Shows info about the server");


const verificationTypes = {
    0: "None - Unrestricted",
    1: "Low - Must have a verified email",
    2: "Medium - Must be registered for 5 minutes",
    3: "High - Must be a member for 10 minutes",
    4: "Highest - Must have a verified phone"
}

const premiumTiers = {
    0: "None",
    1: "Tier 1",
    2: "Tier 2",
    3: "Tier 3"
}

const filterLevels = {
    0: "Disabled",
    1: "Members without roles",
    2: "All members"
}

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const guild = interaction.guild!;
    const { renderUser, renderDelta } = client.logger;
    interaction.reply({
        embeds: [
            new EmojiEmbed()
                .setTitle("Server Info")
                .setStatus("Success")
                .setEmoji("GUILD.GREEN")
                .setDescription(
                    generateKeyValueList({
                        name: guild.name,
                        id: `\`${guild.id}\``,
                        owner: `${renderUser((await guild.fetchOwner()).user)}`,
                        created: `${renderDelta(guild.createdTimestamp)}`,
                        emojis:
                            `${guild.emojis.cache.size}` +
                            (guild.emojis.cache.size > 1
                                ? `\n> ${guild.emojis.cache
                                        .first(10)
                                        .map((emoji) => `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`)
                                        .join(" ")}` +
                                    (guild.emojis.cache.size > 10 ? ` and ${guild.emojis.cache.size - 10} more` : "")
                                : ""),
                        icon: `[Discord](${guild.iconURL()})`,
                        "2 factor authentication": `${
                            guild.mfaLevel === GuildMFALevel.None
                                ? `${getEmojiByName("CONTROL.CROSS")} No`
                                : `${getEmojiByName("CONTROL.TICK")} Yes`
                        }`,
                        "verification level": `${toCapitals(verificationTypes[guild.verificationLevel])}`,
                        "explicit content filter": `${filterLevels[guild.explicitContentFilter]}`,
                        "nitro boost level": `${premiumTiers[guild.premiumTier]}`,
                        channels: `${guild.channels.cache.size}`,
                        roles: `${guild.roles.cache.size}`,
                        members: `${guild.memberCount}`
                    })
                )
                .setThumbnail(guild.iconURL())
        ],
        ephemeral: true
    });
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
