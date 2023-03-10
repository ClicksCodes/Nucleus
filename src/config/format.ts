import fs from "fs";
import * as readLine from "node:readline/promises";

const defaultDict: Record<string, string | string[] | boolean | Record<string, string | number>> = {
    developmentToken: "Your development bot token (Used for testing in one server, rather than production)",
    developmentGuildID: "Your development guild ID",
    enableDevelopment: true,
    token: "Your bot token",
    managementGuildID: "Your management guild ID (Used for running management commands on the bot)",
    owners: [],
    commandsFolder: "Your built commands folder (usually dist/commands)",
    eventsFolder: "Your built events folder (usually dist/events)",
    messageContextFolder: "Your built message context folder (usually dist/context/messages)",
    userContextFolder: "Your built user context folder (usually dist/context/users)",
    verifySecret:
        "If using verify, enter a code here which matches the secret sent back by your website. You can use a random code if you do not have one already. (Optional)",
    mongoUsername: "Your Mongo username (optional)",
    mongoPassword: "Your Mongo password (optional)",
    mongoDatabase: "Your Mongo database name (optional, e.g. Nucleus)",
    mongoHost: "Your Mongo host (optional, e.g. localhost:27017)",
    mongoOptions: {
        username: "",
        password: "",
        database: "",
        host: "",
        authSource: ""
    },
    baseUrl: "Your website where buttons such as Verify and Role menu will link to, e.g. https://example.com/",
    pastebinApiKey: "An API key for pastebin (optional)",
    pastebinUsername: "Your pastebin username (optional)",
    pastebinPassword: "Your pastebin password (optional)",
    rapidApiKey: "Your RapidAPI key (optional), used for Unscan",
    clamav: {
        socket: "Your ClamAV socket file (optional)",
        host: "Your ClamAV host (optional)",
        port: "Your ClamAV port (optional)"
    }
};

const readline = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getInput(prompt: string): Promise<string> {
    process.stdout.write(prompt);

    const answer = await readline.question(prompt);
    return answer.toString();
}

export default async function (walkthrough = false) {
    if (walkthrough) {
        console.log("\x1b[33m🛈  Entering walkthrough mode for any missing values.");
        console.log("   \x1b[2mIf you don't want to enter a value, just hit enter.\x1b[0m\n");

        // let toUse = await getInput("\x1b[36m[Installing packages] Use Yarn or NPM? \x1b[0m(\x1b[32my\x1b[0m/\x1b[31mN\x1b[0m) > ");
        // toUse = toUse.toLowerCase() === "y" ? "yarn install" : "npm i";
        // if ((await getInput(`\x1b[36m[Installing packages] Run ${toUse}? \x1b[0m(\x1b[32mY\x1b[0m/\x1b[31mn\x1b[0m) > `)).toLowerCase() !== "n") {
        //     console.log(`\x1b[32m[Installing packages] Running ${toUse}...\x1b[0m`);
        //     await exec(toUse);
        //     console.log(`\x1b[32m[Installing packages] Installed\x1b[0m`);
        // } else {
        //     console.log("\x1b[32m[Installing packages] Skipping...\x1b[0m");
        // }
    }

    let json: typeof defaultDict;
    let out = true;
    try {
        json = (await import("./main.js")) as unknown as typeof defaultDict;
    } catch (e) {
        console.log("\x1b[31m⚠ No main.ts found, creating one.");
        console.log("  \x1b[2mYou can edit src/config/main.ts directly using template written to the file.\x1b[0m\n");
        out = false;
        json = {} as typeof defaultDict;
    }

    if (Object.keys(json).length) {
        if (json["token"] === defaultDict["token"] || json["developmentToken"] === defaultDict["developmentToken"]) {
            console.log("\x1b[31m⚠ No main.ts found, creating one.");
            console.log(
                "  \x1b[2mYou can edit src/config/main.ts directly using template written to the file.\x1b[0m\n"
            );
            json = {};
        }
    }

    for (const key in defaultDict) {
        if (Object.keys(json).includes(key)) {
            if (walkthrough) {
                switch (key) {
                    case "enableDevelopment": {
                        json[key] =
                            (
                                (await getInput(
                                    "\x1b[36mEnable development mode? This registers commands in a single server making it easier to test\x1b[0m(\x1b[32mY\x1b[0m/\x1b[31mn\x1b[0m) > "
                                )) || "Y"
                            ).toLowerCase() === "y";
                        break;
                    }
                    case "owners": {
                        let chosen = "!";
                        const toWrite = [];
                        while (chosen !== "") {
                            chosen = await getInput(
                                "\x1b[36mEnter an owner ID \x1b[0m(\x1b[35mleave blank to finish\x1b[0m) > "
                            );
                            if (chosen !== "") {
                                toWrite.push(chosen);
                            }
                        }
                        json[key] = toWrite;
                        break;
                    }
                    case "mongoOptions": {
                        break;
                    }
                    default: {
                        json[key] = await getInput(`\x1b[36m${key} \x1b[0m(\x1b[35m${defaultDict[key]}\x1b[0m) > `);
                    }
                }
            } else {
                json[key] = defaultDict[key]!;
            }
        }
    }
    if (walkthrough && !(json["mongoUrl"] ?? false)) json["mongoUrl"] = "mongodb://127.0.0.1:27017";
    if (!((json["baseUrl"] as string | undefined) ?? "").endsWith("/")) (json["baseUrl"] as string) += "/";
    let hosts;
    try {
        hosts = fs.readFileSync("/etc/hosts", "utf8").toString().split("\n");
    } catch (e) {
        return console.log(
            "\x1b[31m⚠ No /etc/hosts found. Please ensure the file exists and is readable. (Windows is not supported, Mac and Linux users should not experience this error)"
        );
    }
    let localhost: string | undefined = hosts.find((line) => line.split(" ")[1] === "localhost");
    if (localhost) {
        localhost = localhost.split(" ")[0];
    } else {
        localhost = "127.0.0.1";
    }
    json["mongoUrl"] = (json["mongoUrl"]! as string).replace("localhost", localhost!);
    json["baseUrl"] = (json["baseUrl"]! as string).replace("localhost", localhost!);
    json["mongoOptions"] = {
        username: json["username"] as string,
        password: json["password"] as string,
        database: json["database"] as string,
        host: json["host"] as string,
        authSource: json["authSource"] as string
    };

    fs.writeFileSync("./src/config/main.ts", "export default " + JSON.stringify(json, null, 4) + ";");

    if (walkthrough) {
        console.log("\x1b[32m✓ All properties added.\x1b[0m");
    }
    return out;
}
