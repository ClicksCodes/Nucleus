declare const config: {
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

export default config;
