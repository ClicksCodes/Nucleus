module.exports = {
    apps: [
        {
            name: "Nucleus",
            script: "/run/current-system/sw/bin/nix",
            args: "develop --command yarn start --update-commands"
        }
    ]
};
