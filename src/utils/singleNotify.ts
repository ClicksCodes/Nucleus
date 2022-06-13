import client from './client.js';
import generateEmojiEmbed from "./generateEmojiEmbed.js";

let severities = {
    "Critical": "Danger",
    "Warning": "Warning",
    "Info": "Success"
}

export default async function(type: string, guild: string, message: string, severity: string) {
    let data = await client.database.read(guild);
    if (data.singleEventNotifications[type]) return;
    data.singleEventNotifications[type] = true;
    client.database.write(guild, data);
    try {
        let channel = await client.channels.fetch(data.logging.staff.channel);
        if (!channel) return;
        await channel.send({embeds: [new generateEmojiEmbed()
            .setTitle(`${severity} notification`)
            .setDescription(message)
            .setStatus(severities[severity])
            .setEmoji("CONTROL.BLOCKCROSS")
        ]})
    } catch (err) {
        console.error(err)
    }
}
