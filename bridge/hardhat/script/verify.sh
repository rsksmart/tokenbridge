#bin/bash

network_flag='bsctestnet'

### npx hardhat --network bsctestnet verify --constructor-args ./hardhat/etherscan/arguments.js
# --contract contracts/zeppelin/upgradable/proxy/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy
# 0x8c1901c031Cdf42a846c0C422A3B5A2c943F4944

# is goind to install jq
if ! command -v jq &> /dev/null
then
    echo "jq could not be found, it will install"
    apt-get install jq -Y
fi


print_usage() {
  printf "Usage: bash verify.sh --n bsctestnet"
}

while getopts 'n:v' flag; do
  case "${flag}" in
    n) network_flag="${OPTARG}" ;;
    *) print_usage
       exit 1 ;;
  esac
done

verifyContractFlag() {
  local _contract_path=$1
  DEPLOYED_CONTRACT=$(cat $_contract_path | jq '.')
  # bridge/deployments/bsctestnet/AllowTokensProxy.json

  CONTRACT_ADDRESS=$(echo $DEPLOYED_CONTRACT | jq '.address')
  CONTRACT_ARGUMENTS=$(echo $DEPLOYED_CONTRACT | jq '.args')
  CONTRACT_METADATA=$(echo $DEPLOYED_CONTRACT | jq '.metadata | fromjson')
  CONTRACT_METADATA_SETTINGS=$(echo $CONTRACT_METADATA | jq '.settings')
  CONTRACT_COMPILATION_TARGET=$(echo $CONTRACT_METADATA_SETTINGS | jq '.compilationTarget')
  CONTRACT_LOCATION=$(echo $CONTRACT_COMPILATION_TARGET | jq 'keys[0]')
  CONTRACT_NAME=$(echo $CONTRACT_COMPILATION_TARGET | jq .$CONTRACT_LOCATION)
  CONTRACT_FLAG=$(echo ${CONTRACT_LOCATION:1:-1}):$(echo ${CONTRACT_NAME:1:-1})

  ARGUMENTS_PATH=arguments.js
  CONTRACT_ADDRESS_STR=$(echo ${CONTRACT_ADDRESS:1:-1})

  npx hardhat --network $network_flag verify \
    --contract $CONTRACT_FLAG \
    --constructor-args $ARGUMENTS_PATH \
    $CONTRACT_ADDRESS_STR

  rm $ARGUMENTS_PATH
}

pwd
verifyContractFlag "./deployments/$network_flag/AllowTokensProxy.json"