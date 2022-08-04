import client from "./client.js";
import EmojiEmbed from "./generateEmojiEmbed.js";

const severities = {
    "Critical": "Danger",
    "Warning": "Warning",
    "Info": "Success"
};

export default async function(type: string, guild: string, message: string | true, severity?: string) {
    const data = await client.database.guilds.read(guild);
    if (message === true) {
        return await client.database.guilds.write(guild, {[`singleEventNotifications.${type}`]: false});
    }
    if (data.singleEventNotifications[type]) return;
    await client.database.guilds.write(guild, {[`singleEventNotifications.${type}`]: true});
    try {
        const channel = await client.channels.fetch(data.logging.staff.channel);
        if (!channel) return;
        await channel.send({embeds: [new EmojiEmbed()
            .setTitle(`${severity} notification`)
            .setDescription(message)
            .setStatus(severities[severity])
            .setEmoji("CONTROL.BLOCKCROSS")
        ]});
    } catch (err) {
        console.error(err);
    }
}
