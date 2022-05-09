import * as fs from 'fs';

function writeLogConfig(guild, logs) {
    if( !fs.existsSync(`./data/guilds/${guild.id}/config.json`) ) {
        fs.rmSync(`./data/guilds/${guild.id}/config.json`);
    }
    if( !fs.existsSync(`./data/guilds/${guild.id}/pins.json`) ) {
        let pins = guild.channels.cache.filter(c => c.type === "GUILD_TEXT").map(
            c => c.messages.fetchPinned().then(m => m.map(m => m.id))
        );
        fs.writeFileSync(`./data/guilds/${guild.id}/pins.json`, JSON.stringify(pins));
    }
    if( !fs.existsSync(`./data/guilds/${guild.id}/logs.json`) ) {
        fs.writeFileSync(`./data/guilds/${guild.id}/logs.json`, JSON.stringify([]));
    } else if( logs ) {
        fs.rmSync(`./data/guilds/${guild.id}/logs.json`);
        fs.writeFileSync(`./data/guilds/${guild.id}/logs.json`, JSON.stringify([]));
    }
    fs.writeFileSync(`./data/guilds/${guild.id}/config.json`, JSON.stringify({
        metadata: {
            premium: false
        },
        logs: {
            enabled: true,
            logChannel: guild.systemChannelId,
            toLog: "8be71",
            toIgnore: {
                bots: false,
                channels: [],
                members: [],
                roles: []
            }
        },
        userVerification: {
            enabled: false,
            roleID: null,
            customMessage: null
        },
        modmail: {
            enabled: false,
            categoryId: null,
            namingScheme: "rsm-{user}-{discriminator}",
        },
        welcome: {
            enabled: false,
            channelId: null,
            message: null,
            messageType: "embed",
        },
        filters: {
            images: {
                NSFW: true,
                size: true
            },
            malware: true,
            wordFilter: {
                enabled: true,
                words: {
                    strict: [],
                    loose: []
                },
                allowed: {
                    users: [],
                    roles: [],
                    channels: []
                }
            },
            invite: {
                enabled: true,
                allowed: {
                    users: [],
                    channels: [],
                    roles: []
                }
            },
            pings: {
                mass: 5,
                everyone: true,
                roles: true,
                allowed: {
                    roles: [],
                    rolesToMention: [],
                    users: [],
                    channels: []
                }
            }
        },
        tags: {}
    }));
}

export default writeLogConfig;