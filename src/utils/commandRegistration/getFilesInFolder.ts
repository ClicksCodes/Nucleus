import fs from "fs";

export default async function getSubcommandsInFolder(path: string) {
    const files = fs.readdirSync(path, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    const subcommands = [];
    const subcommandGroups = [];
    for (const file of files) {
        if (file.name === "_meta.js") continue;
        // If its a folder
        if (file.isDirectory()) {
            // Get the _meta.ts file
            console.log(`│ ├─ Loading subcommand group ${file.name}}`)
            subcommandGroups.push((await import(`../../../${path}/${file.name}/_meta.js`)).command);
        } else if (file.name.endsWith(".js")) {
            // If its a file
            console.log(`│ ├─ Loading subcommand ${file.name}}`)
            subcommands.push((await import(`../../../${path}/${file.name}`)).command);
        }
    }
    return {subcommands, subcommandGroups};
}
