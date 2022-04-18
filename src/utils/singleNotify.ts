import readConfig from "./readConfig.js";
import generateEmojiEmbed from "./generateEmojiEmbed.js";

let severities = {
    "Critical": "Danger",
    "Warning": "Warning",
    "Info": "Success"
}

export default async function(client, type: string, guild: string, message: string, severity: string) {
    let config = await readConfig(guild);
    if (config.singleEventNotifications[type]) return;
    // TODO: Set config.singleEventNotifications[type] to true
    let channel = await client.channels.fetch(config.logging.staff);
    if (!channel) return;
    try {
        await channel.send({embeds: [new generateEmojiEmbed()
            .setTitle(`${severity} notification`)
            .setDescription(message)
            .setColor(severities[severity])
            .setEmoji("CONTROL.BLOCKCROSS")
        ]})
    } catch (err) {
        console.error(err)
    }
}
