{
  description = "A basic flake with a shell";
  inputs.nixpkgs.follows = "clicks-server/nixpkgs";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.clicks-server.url = "github:clicksminuteper/nixfiles";
  inputs.pnpm2nix.url = "github:clicksminuteper/pnpm2nix";

  inputs.pnpm2nix.inputs.nixpkgs.follows = "nixpkgs";

  outputs = { self, nixpkgs, flake-utils, clicks-server, pnpm2nix }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      nodejs = pkgs.nodejs-19_x;
      nodePackages = pkgs.nodePackages_latest;
      lib = pkgs.lib;
    in rec {
      devShells.default = pkgs.mkShell {
        packages = [ nodejs nodePackages.pnpm ];
        shellHook = ''
          unset name
        '';
      };

      packages.env = lib.pipe {
        src = ./.;
      } [
        (pnpm2nix.mkPnpmPackage.${system})
        (pnpm2nix.mkPnpmEnv.${system})
      ];

      packages.default = let
        packageJSON = (builtins.fromJSON (builtins.readFile ./package.json));
      in pkgs.stdenv.mkDerivation {
        pname = "nucleus";
        version = packageJSON.version;

        src = ./.;

        buildInputs = [ packages.env nodejs nodePackages.pnpm ];
        nativeBuildInputs = [ packages.env nodePackages.pnpm ];

        buildPhase = ''
          pnpm run build
        '';

        installPhase = ''
          cp dist $out
          mkdir -p $out/bin
          echo "#!/usr/bin/env bash\ncd $out\n${packageJSON.scripts.start}" > $out/bin/nucleus
        '';
      };

      dockerImage = let
        nucleus = packages.default;
      in pkgs.dockerTools.streamLayeredImage {
        name = "nucleus";
        tag = "latest";
        contents = [ nucleus ];
        config.Cmd = [ "${nucleus}/bin/nucleus" ];
      };
    });
}