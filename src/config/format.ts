import fs from "fs";
import * as readLine from "node:readline/promises";

const defaultDict: Record<string, string | string[] | boolean> = {
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
    mongoUrl: "Your Mongo connection string, e.g. mongodb://127.0.0.1:27017",
    baseUrl: "Your website where buttons such as Verify and Role menu will link to, e.g. https://example.com",
    pastebinApiKey: "An API key for pastebin (optional)",
    pastebinUsername: "Your pastebin username (optional)",
    pastebinPassword: "Your pastebin password (optional)",
    rapidApiKey: "Your RapidAPI key (optional), used for Unscan"
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

    let json;
    let out = true;
    try {
        json = JSON.parse(fs.readFileSync("./src/config/main.json", "utf8"));
    } catch (e) {
        console.log("\x1b[31m⚠ No main.json found, creating one.");
        console.log("  \x1b[2mYou can edit src/config/main.json directly using template written to the file.\x1b[0m\n");
        out = false;
        json = {};
    }
    for (const key in defaultDict) {
        if (!json[key]) {
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
                    default: {
                        json[key] = await getInput(`\x1b[36m${key} \x1b[0m(\x1b[35m${defaultDict[key]}\x1b[0m) > `);
                    }
                }
            } else {
                json[key] = defaultDict[key];
            }
        }
    }
    if (walkthrough && !json.mongoUrl) json.mongoUrl = "mongodb://127.0.0.1:27017";
    if (!json.mongoUrl.endsWith("/")) json.mongoUrl += "/";
    if (!json.baseUrl.endsWith("/")) json.baseUrl += "/";
    let hosts;
    try {
        hosts = fs.readFileSync("/etc/hosts", "utf8").toString().split("\n");
    } catch (e) {
        return console.log(
            "\x1b[31m⚠ No /etc/hosts found. Please ensure the file exists and is readable. (Windows is not supported, Mac and Linux users should not experience this error)"
        );
    }
    let localhost = hosts.find((line) => line.split(" ")[1] === "localhost");
    if (localhost) {
        localhost = localhost.split(" ")[0];
    } else {
        localhost = "127.0.0.1";
    }
    json.mongoUrl = json.mongoUrl.replace("localhost", localhost);
    json.baseUrl = json.baseUrl.replace("localhost", localhost);

    fs.writeFileSync("./src/config/main.json", JSON.stringify(json, null, 4));

    if (walkthrough) {
        console.log("\x1b[32m✓ All properties added.\x1b[0m");
    }
    return out;
}
