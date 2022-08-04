let format;
try {
    format = await import("./dist/config/format.js");
} catch (e) {
    console.log("Please run `yarn` and `yarn build` first.");
}

await format(true);
process.exit(0);