
export default async function readConfig(guild: string): Promise<any> {

	let config = {
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
			staff: {}
		},
		verify: {
			enabled: true,
			channel: '895210691479355392',
			role: '934941369137524816',
		},
		tickets: {
			enabled: true,
			category: "952302254302584932",
			types: "3f",
			customTypes: null,
			supportRole: null,
			maxTickets: 5
		}
	};

	return config

}