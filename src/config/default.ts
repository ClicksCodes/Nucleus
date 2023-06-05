import type { GuildConfig } from "../utils/database.js";

export default {
    id: "default",
    version: 1,
    singleEventNotifications: {
        statsChannelDeleted: false
    },
    filters: {
        images: {
            NSFW: false,
            size: false
        },
        malware: false,
        wordFilter: {
            enabled: false,
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
            enabled: false,
            allowed: {
                users: [],
                roles: [],
                channels: []
            }
        },
        pings: {
            mass: 5,
            everyone: true,
            roles: true,
            allowed: {
                users: [],
                roles: [],
                channels: [],
                rolesToMention: []
            }
        },
        clean: {
            channels: [],
            allowed: {
                users: [],
                roles: []
            }
        }
    },
    welcome: {
        enabled: false,
        role: null,
        ping: null,
        channel: null,
        message: null
    },
    stats: {},
    logging: {
        logs: {
            enabled: false,
            channel: null,
            toLog: "3fffff"
        },
        staff: {
            channel: null
        },
        attachments: {
            channel: null,
            saved: {}
        }
    },
    verify: {
        enabled: false,
        role: null
    },
    tickets: {
        enabled: false,
        category: null,
        types: "3f",
        customTypes: null,
        useCustom: false,
        supportRole: null,
        maxTickets: 5
    },
    moderation: {
        mute: {
            timeout: true,
            role: null,
            text: null,
            link: null
        },
        kick: {
            text: null,
            link: null
        },
        ban: {
            text: null,
            link: null
        },
        softban: {
            text: null,
            link: null
        },
        warn: {
            text: null,
            link: null
        },
        role: {
            role: null,
            text: null,
            link: null
        },
        nick: {
            text: null,
            link: null
        }
    },
    tracks: [],
    roleMenu: {
        enabled: true,
        allowWebUI: false,
        options: []
    },
    tags: {},
    autoPublish: {
        enabled: true,
        channels: []
    }
} as GuildConfig;
