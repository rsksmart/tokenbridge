const federationsForNetwork = {
    goerli: 'Federation',
    rsktestnet: 'FederationV2',
  };
exports.getFederation = name => federationsForNetwork[name] || 'Federation';