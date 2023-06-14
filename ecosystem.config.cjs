module.exports = {
    apps: [
        {
            name: "Nucleus",
            script: "/run/current-system/sw/bin/nix",
            args: "develop --command pnpm start --update-commands"
        }
    ]
};
