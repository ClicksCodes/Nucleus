{
  description = "A basic flake with a shell";
  inputs.nixpkgs.follows = "clicks-server/nixpkgs";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.clicks-server.url = "git+ssh://git@github.com/clicksminuteper/nixfiles";
  inputs.pnpm2nix.url = "git+ssh://git@github.com/clicksminuteper/pnpm2nix";
  inputs.devenv.url = "github:cachix/devenv";

  inputs.pnpm2nix.inputs.nixpkgs.follows = "nixpkgs";

  outputs = { self, devenv, nixpkgs, flake-utils, clicks-server, pnpm2nix, ... }@inputs:
    flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          nodejs = pkgs.nodejs_20;
          nodePackages = pkgs.nodePackages_latest;
          lib = pkgs.lib;

          shellPackages = [ nodejs nodePackages.pnpm pkgs.pkg-config pkgs.fontconfig.dev pkgs.clamav ];

          enterShellHook = ''
            unset name
            export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:${lib.makeSearchPath "/lib/pkgconfig" [
              pkgs.pixman
              pkgs.cairo.dev
              pkgs.libpng.dev
              pkgs.gnome2.pango.dev
              pkgs.glib.dev
              pkgs.harfbuzz.dev
              pkgs.freetype.dev
            ]}
          '';
        in
        rec {
          devShells.pure = pkgs.mkShell {
            packages = shellPackages;
            shellHook = enterShellHook;
          };
          devShells.default = devenv.lib.mkShell {
            inherit inputs pkgs;


            modules = [
              ({ pkgs, config, ... }: {
                # This is your devenv configuration
                packages = shellPackages;
                enterShell = enterShellHook;

                services.mongodb = {
                  enable = true;
                  package = pkgs.mongodb-6_0;
                  additionalArgs = [
                    "--port"
                    "27017"
                    "--noauth"
                  ];
                };

                processes.clamav.exec =
                  let
                    clamd_config = pkgs.writeText "clamd.conf" ''
                      TCPSocket 3310
                      PidFile /tmp/clamav-nucleus.pid
                      DatabaseDirectory ${config.env.DEVENV_STATE}/clamav/db
                      TemporaryDirectory /tmp
                      Foreground true
                    '';
                    freshclam_config = pkgs.writeText "freshclam.conf" ''
                      DatabaseDirectory ${config.env.DEVENV_STATE}/clamav/db
                      DatabaseMirror database.clamav.net
                    '';
                  in
                  "mkdir -p $DEVENV_STATE/clamav/db && ${pkgs.clamav}/bin/freshclam --config ${freshclam_config} || true; ${pkgs.clamav}/bin/clamd -c ${clamd_config}";
              })
            ];
          };
        }) // {
      packages.x86_64-linux =
        let
          pkgs = nixpkgs.legacyPackages.x86_64-linux;
          nodejs = pkgs.nodejs_20;
          nodePackages = pkgs.nodePackages_latest;
          lib = pkgs.lib;
        in
        rec {
          nucleus =
            let
              packageJSON = (builtins.fromJSON (builtins.readFile ./package.json));
              node_modules = lib.pipe
                {
                  src = ./.;
                  linkDevDependencies = true;
                  overrides = pnpm2nix.defaultPnpmOverrides.x86_64-linux // {
                    canvas = (drv: drv.overrideAttrs (oldAttrs: {
                      nativeBuildInputs = oldAttrs.nativeBuildInputs ++ [ pkgs.pkg-config ];
                      buildInputs = oldAttrs.buildInputs ++ [
                        pkgs.pixman
                        pkgs.cairo.dev
                        pkgs.libpng.dev
                        pkgs.gnome2.pango.dev
                        pkgs.glib.dev
                        pkgs.harfbuzz.dev
                        pkgs.freetype.dev
                      ];
                    }));

                    "@tensorflow/tfjs-node" = (drv: drv.overrideAttrs (oldAttrs: {
                      buildInputs = oldAttrs.buildInputs ++ [
                        pkgs.libtensorflow
                      ];

                      preBuild = ''
                        mkdir -p node_modules/@tensorflow/tfjs-node/deps/lib
                        ln -s ${pkgs.libtensorflow}/lib/libtensorflow.so.2 node_modules/@tensorflow/tfjs-node/deps/lib/libtensorflow.so.2.9.1
                      '';
                    }));
                  };
                } [
                (pnpm2nix.mkPnpmPackage.x86_64-linux)
                (drv: builtins.readFile "${drv}/nix-support/propagated-build-inputs")
                (path: "${path}/node_modules")
              ];

            in
            pkgs.stdenv.mkDerivation {
              pname = "nucleus";
              version = packageJSON.version;

              src = ./.;

              buildInputs = [ nodejs nodePackages.pnpm ];
              nativeBuildInputs = [ nodePackages.pnpm nodePackages.typescript pkgs.python3 ];

              buildPhase = ''
                ${pkgs.python3}/bin/python3 ${./scripts/fix-pnpm-bin.py} ${node_modules} ./bin
                export PATH=$PATH:./bin
                ln -s ${node_modules} node_modules
                pnpm run build
              '';

              installPhase = ''
                mkdir -p $out

                cp dist $out -r
                cp node_modules $out -r
                cp bin $out/.bin -r
                cp package.json $out
                cp LICENSE $out

                mkdir -p $out/bin
                echo "#!/usr/bin/env bash" > $out/bin/nucleus
                echo "cd $out" >> $out/bin/nucleus
                echo "export PATH=$PATH:$out/node_modules/.bin" >> $out/bin/nucleus
                echo "${packageJSON.scripts.start}" >> $out/bin/nucleus
                chmod +x $out/bin/nucleus
              '';
            };

          dockerImage = pkgs.dockerTools.streamLayeredImage {
            name = "nucleus";
            tag = "latest";
            contents = [ nucleus ];
            config.Cmd = [ "${nucleus}/bin/nucleus" ];
          };

          default = nucleus;
        };
    };
}
