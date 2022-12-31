import fs from "fs";

export default async function getSubcommandsInFolder(path: string, indent: string = "") {
    const files = fs.readdirSync(path, { withFileTypes: true }).filter(
        file => !file.name.endsWith(".ts") && !file.name.endsWith(".map")
    );
    const subcommands = [];
    const subcommandGroups = [];
    let errors = 0;
    for (const file of files) {
        if (file.name === "_meta.js") continue;
        try {
            if (file.isDirectory()) {
                // Get the _meta.ts file
                subcommandGroups.push((await import(`../../../${path}/${file.name}/_meta.js`)).command);
            } else if (file.name.endsWith(".js")) {
                // If its a file
                console.log(`│  ${indent}├─ Loading subcommand ${file.name}`)
                subcommands.push((await import(`../../../${path}/${file.name}`)).command);
            }
        } catch (e) {
            console.error(`│  ${indent}│  └─ Error loading ${file.name}: ${e}`);
            errors++;
        }
    }
    return {subcommands, subcommandGroups, errors};
}
