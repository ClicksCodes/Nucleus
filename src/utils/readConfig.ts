
export default async function readConfig(guild: string): Promise<any> {

    let config = {
        singleEventNotifications: {
            statsChannelDeleted: false
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
                enabled: false,
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
        welcome: {
            enabled: true,
            verificationRequired: {
                message: false,
                role: false
            },
            welcomeRole: null,
            channel: '895209752315961344', // null, channel ID or 'dm'
            message: "Welcome to the server, {@}!"
        },
        stats: [
            {
                enabled: true,
                channel: '951910554291818526',
                text: "{count} members | {count:bots} bots | {count:humans} humans"
            }
        ],
        logging: {
            logs: {
                enabled: true,
                channel: '952247098437427260',
                toLog: "3fffff" // "3ffffe" = - channelUpdate, "3fffff" = all
            },
            staff: {
                channel: "895212366252367933"
            }
        },
        verify: {
            enabled: true,
            role: '934941369137524816',
        },
        tickets: {
            enabled: true,
            category: "952302254302584932",
            types: "3f",
            customTypes: null,
            supportRole: null,
            maxTickets: 5
        },
        moderation: {
            mute: {
                timeout: true,
                role: null, // TODO: actually give it
                text: null,
                link: null
            },
            kick: {
                text: "Appeal here",
                link: "https://clicksminuteper.net"
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
                role: "934941369137524816"
            },
        },
        tracks: [
            {
                name: "Moderation",
                retainPrevious: false,
                nullable: true,
                track: [
                    "934941369137524816",
                    "934941399806246984",
                    "934941408849186856",
                    "934941466734764092"
                ],
                manageableBy: []
            },
            {
                name: "Verification",
                retainPrevious: false,
                nullable: true,
                track: [
                    "963166531318067250"
                ],
                manageableBy: []
            }
        ],
        roleMenu: {
            enabled: true,
            allowWebUI: true,
            options: [
                {
                    name: "Gender",
                    description: "What's your gender?",
                    min: 1,
                    max: 1,
                    options: [
                        { name: "Male", role: "959901318019948574" },
                        { name: "Female", role: "959901346000154674" },
                        { name: "Non Binary", description: "Better than the others", role: "959901378363420704"}
                    ]
                },
                {
                    name: "Pick",
                    min: 0,
                    max: 4,
                    options: [
                        { name: "Test Role 1", role: "934941369137524816" },
                        { name: "Test Role 2", role: "934941399806246984" },
                        { name: "Test Role 3", role: "934941408849186856" },
                        { name: "Test Role 4", role: "934941466734764092" }
                    ]
                }
            ]
        }
    };
    return config;
}
