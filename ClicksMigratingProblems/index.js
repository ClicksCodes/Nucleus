import fs from "fs";
import { MongoClient } from "mongodb";

const mongoClient = new MongoClient("mongodb://127.0.0.1:27017/local");
await mongoClient.connect();
const database = mongoClient.db("Nucleus");
const collection = database.collection("migrationTesting");

// Loop through all files in the oldData folder
const files = fs.readdirSync("./oldData");
let x = 0;
for (const file of files) {
    console.log(`┌ Processing file ${x} of ${files.length - 1} | ${file}`);
    // Read the file as a json
    let data;
    try {
        data = JSON.parse(fs.readFileSync(`./oldData/${file}`));
    } catch {
        console.log(`└ Error reading file ${file}`);
        x++;
        continue;
    }
    // Check if data version is 3
    if (data.version !== 3) {
        console.log(`├ Version was too old on ${file}`);
        console.log("└ Skipping file");
        x++;
        continue;
    }
    // Convert to the new format
    const newData = {
        "id": data.guild_info.id.toString(),
        "version": 1,
        "singleEventNotifications": {
            "statsChannelDeleted": false
        },
        "filters": {
            "images": {
                "NSFW": !data.images.nsfw,
                "size": data.images.toosmall
            },
            "wordFilter": {
                "enabled": true,
                "words": {
                    "strict": data.wordfilter.strict,
                    "loose": data.wordfilter.soft
                }
            },
            "invite": {
                "enabled": data.invite ? data.invite.enabled : false,
                "channels": data.invite ? data.invite.whitelist.channels.map(channel => channel.toString()) : []
            },
            "pings": {
                "mass": 5,
                "everyone": true,
                "roles": true
            }
        },
        "welcome": {
            "enabled": data.welcome ? (data.welcome.message.text !== null) : false,
            "verificationRequired": {
                "message": null,
                "role": null
            },
            "role": data.welcome ? (data.welcome.role !== null ? data.welcome.role.toString() : null) : null,
            "channel": data.welcome ? (data.welcome.message.text !== null ? data.welcome.message.channel.toString() : null) : null,
            "message": data.welcome ? (data.welcome.message.text) : null
        },
        "stats": {},
        "logging": {
            "logs": {
                "enabled": true,
                "channel": data.log_info.log_channel ? data.log_info.log_channel.toString() : null,
                "toLog": "3fffff"
            },
            "staff": {
                "channel": data.log_info.staff ? data.log_info.staff.toString() : null
            }
        },
        "verify": {
            "enabled": data.verify_role !== null,
            "role": data.verify_role ? data.verify_role.toString() : null
        },
        "tickets": {
            "enabled": data.modmail ? (data.modmail.cat !== null) : null,
            "category": data.modmail ? (data.modmail.cat !== null ? data.modmail.cat.toString() : null) : null,
            "types": "3f",
            "customTypes": null,
            "supportRole": data.modmail ? (data.modmail.mention !== null ? data.modmail.mention.toString() : null) : null,
            "maxTickets": data.modmail ? (data.modmail.max) : 5
        },
        "moderation": {
            "mute": {
                "timeout": true,
                "role": null,
                "text": null,
                "link": null
            },
            "kick": {
                "text": null,
                "link": null
            },
            "ban": {
                "text": null,
                "link": null
            },
            "softban": {
                "text": null,
                "link": null
            },
            "warn": {
                "text": null,
                "link": null
            },
            "role": {
                "role": null
            }
        },
        "tracks": [],
        "roleMenu": [],
        "tags": data.tags
    };
    // Insert the new data into the database
    await collection.updateOne({ id: data.guild_info.id.toString() }, { $set: newData }, { upsert: true });
    // Delete the old file
    fs.unlinkSync(`./oldData/${file}`);
    console.log(`└ Successfully migrated file ${file}`);
    x++;
}


// console.log((await collection.findOne({ id: "your mother" })));
