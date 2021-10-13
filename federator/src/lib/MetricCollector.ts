import datadogMetrics from 'datadog-metrics';

const DEFAULT_PROJECT_METRIC_PREFIX = 'interoperability.token_bridge.';
const DEFAULT_DATADOG_AGENT_HOST = 'localhost';
const FEDERATOR_VOTING_METRIC_NAME = 'federator.voting';
const ADDRESS_METRIC_TAG_KEY = 'address';
const FED_VERSION_METRIC_TAG_KEY = 'fed_version';
const CHAIN_ID_METRIC_TAG_KEY = 'chain_id';
const RESULT_METRIC_TAG_KEY = 'result';
const TYPE_METRIC_TAG_KEY = 'type';
const DEFAULT_INCREMENT_METRIC_VALUE = 1;

enum TokenType {
  ERC20 = 'erc20',
  ERC721 = 'erc721',
}

enum ChainType {
  MAIN = 'main',
  SIDE = 'side',
}

export class MetricCollector {
  constructor() {
    if (!process.env.DATADOG_API_KEY) {
      throw new Error("Datadog API key is not set as environment variable 'DATADOG_API_KEY'");
    }
    datadogMetrics.init({ host: DEFAULT_DATADOG_AGENT_HOST, prefix: DEFAULT_PROJECT_METRIC_PREFIX });
  }

  trackERC20FederatorVotingResult(
    wasTransactionVoted: boolean,
    federatorAddress: string,
    federatorVersion: string,
    chainId: number,
  ) {
    MetricCollector.trackFederatorVotingResult(
      wasTransactionVoted,
      federatorAddress,
      federatorVersion,
      chainId,
      TokenType.ERC20,
    );
  }

  trackERC721FederatorVotingResult(
    wasTransactionVoted: boolean,
    federatorAddress: string,
    federatorVersion: string,
    chainId: number,
  ) {
    MetricCollector.trackFederatorVotingResult(
      wasTransactionVoted,
      federatorAddress,
      federatorVersion,
      chainId,
      TokenType.ERC721,
    );
  }

  private static trackFederatorVotingResult(
    wasTransactionVoted: boolean,
    federatorAddress: string,
    federatorVersion: string,
    chainId: number,
    tokenType: string,
  ) {
    datadogMetrics.increment(FEDERATOR_VOTING_METRIC_NAME, DEFAULT_INCREMENT_METRIC_VALUE, [
      `${ADDRESS_METRIC_TAG_KEY}:${federatorAddress}`,
      `${FED_VERSION_METRIC_TAG_KEY}:${federatorVersion}`,
      `${CHAIN_ID_METRIC_TAG_KEY}:${chainId}`,
      `${RESULT_METRIC_TAG_KEY}:${wasTransactionVoted}`,
      `${TYPE_METRIC_TAG_KEY}:${tokenType}`,
    ]);
  }

  trackMainChainHeartbeatEmission(
    from: number,
    fedVersion: string,
    fedBlock: number,
    nodeInfo: string,
    chainId: number,
  ) {
    MetricCollector.trackHeartbeatEmission(from, fedVersion, fedBlock, nodeInfo, chainId, ChainType.MAIN);
  }

  trackSideChainHeartbeatEmission(
    from: number,
    fedVersion: string,
    fedBlock: number,
    nodeInfo: string,
    chainId: number,
  ) {
    MetricCollector.trackHeartbeatEmission(from, fedVersion, fedBlock, nodeInfo, chainId, ChainType.SIDE);
  }

  private static trackHeartbeatEmission(
    from: number,
    fedVersion: string,
    fedBlock: number,
    nodeInfo: string,
    chainId: number,
    chainType: string,
  ) {
    datadogMetrics.gauge(`heartbeat.${chainType}_chain.emission`, fedBlock, [
      `address:${from}`,
      `fed_version:${fedVersion}`,
      `node_info:${nodeInfo}`,
      `chain_id:${chainId}`,
    ]);
  }
}
