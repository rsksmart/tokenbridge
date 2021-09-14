import argparse
import sys
import os
import json
from subprocess import PIPE, run

ARGUMENTS_PATH = "arguments.js"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-n", "--network", help="Network name")
    args = parser.parse_args()
    network = args.network
    if network is None:
        sys.exit("Network name was not passed, usage example: python verify.py -n rinkeby")
    print("Verifying for network {}".format(network))

    contract_file_paths = None

    try:
        contract_file_paths = get_contract_file_paths(network)
    except Exception as e:
        print('Failed to get contract file paths: {}'.format(str(e)))
        return

    for contract_file_path in contract_file_paths:
        try:
            verify_contract(contract_file_path, network)
        except Exception as e:
            print('Failed to verify contract in path \'{}\': {}'.format(contract_file_path, str(e)))

def get_contract_file_paths(network):
    directory = "./deployments/{}".format(network)
    contract_file_paths = []
    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            filepath = os.path.join(directory, filename)
            contract_file_paths.append(filepath)
    return contract_file_paths

def verify_contract(contract_file_path, network):
    file = open(contract_file_path)
    contract_json = json.load(file)
    address = contract_json.get('address', None)
    arguments = contract_json.get('args', None)
    metadata_settings = json.loads(contract_json.get('metadata', None)).get('settings', None)
    compilation_target = metadata_settings.get('compilationTarget', {})
    location = list(compilation_target.keys())[0]
    name = compilation_target.get(location)
    flag = '{}:{}'.format(location, name)
    with open(ARGUMENTS_PATH, "w") as arguments_file:
        print("module.exports = {}".format(arguments), file=arguments_file)

    hardhat_verify_arguments = ["npx", "hardhat", "--network", network, "verify", "--contract", flag, "--constructor-args", ARGUMENTS_PATH, address]
    result = run(hardhat_verify_arguments, stdout=PIPE, stderr=PIPE, universal_newlines=True)
    print('Verifying contract {} ({})'.format(name, address))
    print("Result:\n", result.returncode, result.stdout, result.stderr)

main()