import sys
import os
import json

node_modules = sys.argv[1]
bin_dir = sys.argv[2]

def collect_packages_in(_node_modules, packages: set[str] | None = None):
    _packages: set[str] = packages or set()
    for path in os.listdir(_node_modules):
        if not os.path.isdir(os.path.join(_node_modules, path)) or os.path.join(_node_modules, path) in _packages:
            continue

        _packages.add(os.path.join(_node_modules, path))
        if os.path.exists(os.path.join(_node_modules, path, "node_modules")):
            collect_packages_in(os.path.join(_node_modules, path, "node_modules"), _packages)
    return _packages

def get_binaries_in(package):
    package_json = os.path.join(package, "package.json")
    if not os.path.exists(package_json):
        return []

    with open(package_json) as f:
        package_json_contents = json.load(f)

    if "bin" not in package_json_contents:
        return []

    if type(package_json_contents["bin"]) == str:
        return [[os.path.basename(package_json_contents["name"]), os.path.join(package, package_json_contents["bin"])]]

    return [[name, os.path.join(package, bin)] for name, bin in package_json_contents["bin"].items()]

def main():
    packages = collect_packages_in(node_modules)
    binaries = []
    for package in packages:
        binaries += get_binaries_in(package)

    os.makedirs(bin_dir, exist_ok=True)

    for binary in binaries:
        if os.path.exists(os.path.join(bin_dir, binary[0])):
            os.remove(os.path.join(bin_dir, binary[0]))

        os.symlink(os.path.realpath(binary[1]), os.path.join(bin_dir, binary[0]))

if __name__ == "__main__":
    main()
