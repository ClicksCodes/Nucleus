import client from './client.js';
import EmojiEmbed from "./generateEmojiEmbed.js";

let severities = {
    "Critical": "Danger",
    "Warning": "Warning",
    "Info": "Success"
}

export default async function(type: string, guild: string, message: string, severity: string) {
    let data = await client.database.guilds.read(guild);
    if (data.singleEventNotifications[type]) return;
    data.singleEventNotifications[type] = true;
    client.database.guilds.write(guild, data);
    try {
        let channel = await client.channels.fetch(data.logging.staff.channel);
        if (!channel) return;
        await channel.send({embeds: [new EmojiEmbed()
            .setTitle(`${severity} notification`)
            .setDescription(message)
            .setStatus(severities[severity])
            .setEmoji("CONTROL.BLOCKCROSS")
        ]})
    } catch (err) {
        console.error(err)
    }
}
