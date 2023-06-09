{
  description = "A basic flake with a shell";
  inputs.nixpkgs.follows = "clicks-server/nixpkgs";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.clicks-server.url = "git+ssh://git@github.com/clicksminuteper/nixfiles";
  inputs.pnpm2nix.url = "git+ssh://git@github.com/clicksminuteper/pnpm2nix";

  inputs.pnpm2nix.inputs.nixpkgs.follows = "nixpkgs";

  outputs = { self, nixpkgs, flake-utils, clicks-server, pnpm2nix }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      nodejs = pkgs.nodejs_20;
      nodePackages = pkgs.nodePackages_latest;
      lib = pkgs.lib;
    in rec {
      devShells.default = pkgs.mkShell {
        packages = [ nodejs nodePackages.pnpm pkgs.pkg-config pkgs.fontconfig.dev ];
        shellHook = ''
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
