let format;
try {
    format = (await import("./dist/config/format.js")).default;
} catch (e) {
    console.log("Please run `yarn` and `yarn build` first.");
    process.exit(1);
}

await format(true);
process.exit(0);

export {};
