import { MongoClient } from 'mongodb';

const mongoClient = new MongoClient('mongodb://127.0.0.1:27017/local');
await mongoClient.connect()
const database = mongoClient.db("Nucleus");
const collection = database.collection("history");

for (let i = 0; i < 100; i++) {
    // Select a type
    let type = ["join", "unban", "leave", "ban", "softban", "kick", "mute", "purge", "warn", "nickname"][Math.floor(Math.random() * 9)];
    // Select a random date in the last year
    let date = new Date(new Date().getTime() - Math.floor(Math.random() * 31536000000));
    // Add to database
    await collection.insertOne({
        type: type,
        occurredAt: date,
        user: "438733159748599813",
        guild: "864185037078790195",
        moderator: (["unban", "ban", "softban", "kick", "mute", "purge", "warn"].includes(type)) ? "438733159748599813" : null,
        reason: (["unban", "ban", "softban", "kick", "mute", "purge", "warn"].includes(type)) ? "Test" : null,
        before: (type == "nickname") ? "TestBefore" : null,
        after: (type == "nickname") ? "TestAfter" : null,
        amount: (type == "purge") ? Math.floor(Math.random() * 100) : null,
    });
    console.log("Inserted document " + i);
}
