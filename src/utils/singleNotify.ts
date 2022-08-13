import client from "./client.js";
import EmojiEmbed from "./generateEmojiEmbed.js";
import { Record as ImmutableRecord } from "immutable";

const severitiesType = ImmutableRecord({
    Critical: "Danger",
    Warning: "Warning",
    Info: "Success"
} as Record<string, "Danger" | "Warning" | "Success">);
const severities = severitiesType();

export default async function (
    type: string,
    guild: string,
    message: string | true,
    severity: "Critical" | "Warning" | "Info" = "Info"
) {
    const data = await client.database.guilds.read(guild);
    if (message === true) {
        return await client.database.guilds.write(guild, {
            [`singleEventNotifications.${type}`]: false
        });
    }
    if (data.singleEventNotifications[type]) return;
    await client.database.guilds.write(guild, {
        [`singleEventNotifications.${type}`]: true
    });
    try {
        const channel = await client.channels.fetch(data.logging.staff.channel);
        if (!channel) return;
        await channel.send({
            embeds: [
                new EmojiEmbed()
                    .setTitle(`${severity} notification`)
                    .setDescription(message)
                    .setStatus(severities.get(severity))
                    .setEmoji("CONTROL.BLOCKCROSS")
            ]
        });
    } catch (err) {
        console.error(err);
    }
}