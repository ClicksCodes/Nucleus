import type { NucleusClient } from "../utils/client.js";
import convertCurlyBracketString from "../utils/convertCurlyBracketString.js";
import client from "../utils/client.js";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import { GuildChannel, GuildMember, BaseGuildTextChannel } from "discord.js";

export async function callback(_client: NucleusClient, member: GuildMember) {
    if (member.user.bot) return;
    const config = await client.database.guilds.read(member.guild.id);
    if (!config.welcome.enabled) return;

    if (config.welcome.channel) {
        let string = config.welcome.message;
        if (string) {
            string = await convertCurlyBracketString(
                string,
                member.id,
                member.displayName,
                member.guild.name,
                member.guild.members
            );
            if (config.welcome.channel === "dm") {
                await member.send({
                    embeds: [new EmojiEmbed().setDescription(string).setStatus("Success")]
                });
            } else {
                const channel: GuildChannel | null = await member.guild.channels.fetch(config.welcome.channel);
                if (!channel) return; // TODO: SEN
                if (!(channel instanceof BaseGuildTextChannel)) return;
                if (channel.guild.id !== member.guild.id) return;
                try {
                    await channel.send({
                        embeds: [new EmojiEmbed().setDescription(string).setStatus("Success")],
                        content: (config.welcome.ping ? `<@${config.welcome.ping}>` : "") + `<@${member.id}>`
                    });
                } catch (err) {
                    console.error(err); // TODO: SEN
                }
            }
        }
    }
}
