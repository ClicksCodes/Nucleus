interface config {
    developmentToken: string;
    developmentGuildID: string;
    enableDevelopment: boolean;
    token: string;
    managementGuildID: string;
    owners: string[];
    commandsFolder: string;
    eventsFolder: string;
    messageContextFolder: string;
    userContextFolder: string;
    verifySecret: string;
    mongoOptions: {
        username: string;
        password: string;
        database: string;
        host: string;
        authSource: string;
    };
    baseUrl: string;
    clamav: {
        socket?: string;
        host?: string;
        port?: number;
    };
    githubPAT: string;
    suggestionChannel: string;
};

export default {
    "token": process.env["TOKEN"]!,
    "developmentToken": process.env["DEV_TOKEN"]!,
    "managementGuildID": process.env["MANAGEMENT_GUILD_ID"]!,
    "developmentGuildID": process.env["DEV_GUILD_ID"]!,
    "enableDevelopment": process.env["ENABLE_DEV"] === "true",
    "owners": process.env["OWNERS"]?.split(","),

    "commandsFolder": process.env["COMMANDS_FOLDER"] ?? "dist/commands",
    "eventsFolder": process.env["EVENTS_FOLDER"] ?? "dist/events",
    "messageContextFolder": process.env["MESSAGE_CONTEXT_FOLDER"] ?? "dist/context/messages",
    "userContextFolder": process.env["USER_CONTEXT_FOLDER"] ?? "dist/context/users",

    "verifySecret": process.env["VERIFY_SECRET"]!,
    "mongoOptions": {
        "username": process.env["MONGO_USERNAME"]!,
        "password": process.env["MONGO_PASSWORD"]!,
        "host": process.env["MONGO_HOST"]!,
        "database": process.env["MONGO_DATABASE"]!,
        "authSource": process.env["MONGO_AUTH_SOURCE"]!,
    },
    "baseUrl": process.env["BASE_URL"]!,
    "clamav": {
        "host": process.env["CLAMAV_HOST"]!,
        "port": parseInt(process.env["CLAMAV_PORT"] ?? "3310")
    },
    "githubPAT": process.env["GITHUB_PAT"]!,
    "suggestionChannel": process.env["SUGGESTION_CHANNEL"]!,
} as config;