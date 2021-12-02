const web3 = require("web3");
const fs = require("fs");
const TransactionSender = require("./TransactionSender");
const CustomError = require("./CustomError");
const BridgeFactory = require("../contracts/BridgeFactory");
const FederationFactory = require("../contracts/FederationFactory");
const AllowTokensFactory = require("../contracts/AllowTokensFactory");
const utils = require("./utils");
const metrics = require("./MetricCollector");
const typescriptUtils = require("./typescriptUtils");
module.exports = class Federator {
  constructor(config, logger, metricCollector, Web3 = web3) {
    this.config = config;
    this.logger = logger;

    if (
      config.checkHttps &&
      !utils.checkHttpsOrLocalhost(config.mainchain.host)
    ) {
      this.logger.info("Check of checkHttpsOrLocalhost failed");
      throw new Error(
        `Invalid host configuration, https or localhost required`
      );
    }

    this.mainWeb3 = new Web3(config.mainchain.host);
    this.sideWeb3 = new Web3(config.sidechain.host);

    this.sideFederationAddress = null;

    this.transactionSender = new TransactionSender(
      this.sideWeb3,
      this.logger,
      this.config
    );
    this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
    this.revertedTxnsPath = `${
      config.storagePath || __dirname
    }/revertedTxns.json`;
    this.bridgeFactory = new BridgeFactory.BridgeFactory(
      this.config,
      this.logger
    );
    this.federationFactory = new FederationFactory.FederationFactory(
      this.config,
      this.logger
    );
    this.allowTokensFactory = new AllowTokensFactory.AllowTokensFactory(
      this.config,
      this.logger
    );
    this.metricCollector = metricCollector;
  }

  async getCurrentChainId() {
    if (this.chainId === undefined) {
      this.chainId = await this.mainWeb3.eth.net.getId();
    }
    return this.chainId;
  }

  async run() {
    let retries = 3;
    const sleepAfterRetrie = 10_000;
    while (retries > 0) {
      try {
        const currentBlock = await this.mainWeb3.eth.getBlockNumber();
        const chainId = this.getCurrentChainId();

        const isMainSyncing = await this.mainWeb3.eth.isSyncing();
        if (isMainSyncing !== false) {
          this.logger.warn(
            `ChainId ${chainId} is Syncing, ${JSON.stringify(
              isMainSyncing
            )}. Federator won't process requests till is synced`
          );
          return;
        }

        const isSideSyncing = await this.sideWeb3.eth.isSyncing();
        if (isSideSyncing !== false) {
          const sideChainId = await this.sideWeb3.eth.net.getId();
          this.logger.warn(
            `ChainId ${sideChainId} is Syncing, ${JSON.stringify(
              isSideSyncing
            )}. Federator won't process requests till is synced`
          );
          return;
        }

        this.logger.debug(`Current Block ${currentBlock} ChainId ${chainId}`);
        const allowTokens =
          await this.allowTokensFactory.getMainAllowTokensContract();
        const confirmations = await allowTokens.getConfirmations();
        const toBlock = currentBlock - confirmations.largeAmountConfirmations;
        const newToBlock =
          currentBlock - confirmations.smallAmountConfirmations;

        this.logger.info("Running to Block", toBlock);

        if (toBlock <= 0 && newToBlock <= 0) {
          return false;
        }

        if (!fs.existsSync(this.config.storagePath)) {
          await fs.mkdirSync(this.config.storagePath, {
            recursive: true,
          });
        }
        let originalFromBlock = parseInt(this.config.mainchain.fromBlock) || 0;
        let fromBlock = null;
        try {
          fromBlock = parseInt(fs.readFileSync(this.lastBlockPath, "utf8"));
        } catch (err) {
          fromBlock = originalFromBlock;
        }
        if (fromBlock < originalFromBlock) {
          fromBlock = originalFromBlock;
        }
        if (fromBlock >= toBlock && fromBlock >= newToBlock) {
          this.logger.warn(
            `Current chain ${chainId} Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`
          );
          return false;
        }
        fromBlock = fromBlock + 1;
        this.logger.debug("Running from Block", fromBlock);
        await this.getLogsAndProcess(
          fromBlock,
          toBlock,
          currentBlock,
          false,
          confirmations
        );
        let lastBlockProcessed = toBlock;

        this.logger.debug("Started the second Log and Process", newToBlock);
        await this.getLogsAndProcess(
          lastBlockProcessed,
          newToBlock,
          currentBlock,
          true,
          confirmations
        );

        return true;
      } catch (err) {
        this.logger.error(new Error("Exception Running Federator"), err);
        retries--;
        this.logger.debug(`Runned ${3 - retries} retrie`);
        if (retries > 0) {
          await utils.sleep(sleepAfterRetrie);
        } else {
          process.exit(1);
        }
      }
    }
  }

  async getLogsAndProcess(
    fromBlock,
    toBlock,
    currentBlock,
    medmiumAndSmall,
    confirmations
  ) {
    if (fromBlock >= toBlock) return;

    const mainBridge = await this.bridgeFactory.getMainBridgeContract();

    const recordsPerPage = 1000;
    const numberOfPages = Math.ceil((toBlock - fromBlock) / recordsPerPage);
    this.logger.debug(
      `Total pages ${numberOfPages}, blocks per page ${recordsPerPage}`
    );

    let fromPageBlock = fromBlock;
    for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
      let toPagedBlock = fromPageBlock + recordsPerPage - 1;
      if (currentPage === numberOfPages) {
        toPagedBlock = toBlock;
      }
      this.logger.debug(
        `Page ${currentPage} getting events from block ${fromPageBlock} to ${toPagedBlock}`
      );
      const logs = await mainBridge.getPastEvents("Cross", {
        fromBlock: fromPageBlock,
        toBlock: toPagedBlock,
      });
      if (!logs) {
        throw new Error("Failed to obtain the logs");
      }

      this.logger.info(`Found ${logs.length} logs`);
      await this._processLogs(
        logs,
        currentBlock,
        medmiumAndSmall,
        confirmations
      );
      if (!medmiumAndSmall) {
        this._saveProgress(this.lastBlockPath, toPagedBlock);
      }
      fromPageBlock = toPagedBlock + 1;
    }
  }

  async _processLogs(logs, currentBlock, mediumAndSmall, confirmations) {
    try {
      const federatorAddress = await this.transactionSender.getAddress(
        this.config.privateKey
      );
      const sideFedContract =
        await this.federationFactory.getSideFederationContract();
      const allowTokens =
        await this.allowTokensFactory.getMainAllowTokensContract();

      const isMember = await typescriptUtils.retryNTimes(
        sideFedContract.isMember(federatorAddress)
      );
      if (!isMember) {
        throw new Error(
          `This Federator addr:${federatorAddress} is not part of the federation`
        );
      }

      const { mediumAmountConfirmations, largeAmountConfirmations } =
        confirmations;

      for (let log of logs) {
        this.logger.info("Processing event log:", log);

        const { blockHash, transactionHash, logIndex, blockNumber } = log;

        const {
          _to: receiver,
          _from: crossFrom,
          _amount: amount,
          _symbol: symbol,
          _tokenAddress: tokenAddress,
          _decimals: decimals,
          _granularity: granularity,
          _typeId: typeId,
          originChainId: originChainIdStr,
          destinationChainId: destinationChainIdStr,
        } = log.returnValues;

        const originChainId = Number(originChainIdStr);
        const destinationChainId = Number(destinationChainIdStr);
        const originBridge = await this.bridgeFactory.getMainBridgeContract();
        const sideTokenAddress = await utils.retry3Times(
          originBridge.getMappedToken({
            originalTokenAddress: tokenAddress,
            chainId: destinationChainIdStr,
          }).call
        );

        let allowed, mediumAmount, largeAmount;
        if (sideTokenAddress == utils.zeroAddress) {
          ({ allowed, mediumAmount, largeAmount } = await allowTokens.getLimits(
            {
              tokenAddress: tokenAddress,
              chainId: originChainId,
            }
          ));
          if (!allowed) {
            throw new Error(
              `Original Token not allowed nor side token Tx:${transactionHash} originalTokenAddress:${tokenAddress}
               Bridge Contract Addr ${originBridge}`
            );
          }
        } else {
          ({ allowed, mediumAmount, largeAmount } = await allowTokens.getLimits(
            {
              tokenAddress: sideTokenAddress,
              chainId: originChainId,
            }
          ));
          if (!allowed) {
            this.logger.error(
              `Side token:${sideTokenAddress} needs to be allowed Tx:${transactionHash} originalTokenAddress:${tokenAddress}`
            );
          }
        }

        const BN = this.mainWeb3.utils.BN;
        const mediumAmountBN = new BN(mediumAmount);
        const largeAmountBN = new BN(largeAmount);
        const amountBN = new BN(amount);

        if (mediumAndSmall) {
          // At this point we're processing blocks newer than largeAmountConfirmations
          // and older than smallAmountConfirmations
          if (amountBN.gte(largeAmountBN)) {
            const c = currentBlock - blockNumber;
            const rC = largeAmountConfirmations;
            this.logger.debug(
              `[large amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`
            );
            continue;
          }

          if (
            amountBN.gte(mediumAmountBN) &&
            currentBlock - blockNumber < mediumAmountConfirmations
          ) {
            const c = currentBlock - blockNumber;
            const rC = mediumAmountConfirmations;
            this.logger.debug(
              `[medium amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`
            );
            continue;
          }
        }

        const transactionId = await typescriptUtils.retryNTimes(
          sideFedContract.getTransactionId({
            originalTokenAddress: tokenAddress,
            sender: crossFrom,
            receiver,
            amount,
            symbol,
            blockHash,
            transactionHash,
            logIndex,
            decimals,
            granularity,
            typeId,
            originChainId,
            destinationChainId,
          })
        );
        this.logger.info("get transaction id:", transactionId);

        const wasProcessed = await typescriptUtils.retryNTimes(
          sideFedContract.transactionWasProcessed(transactionId)
        );
        if (!wasProcessed) {
          const hasVoted = await sideFedContract.hasVoted(
            transactionId,
            federatorAddress
          );
          if (!hasVoted) {
            this.logger.info(
              `Voting tx: ${log.transactionHash} block: ${log.blockHash} originalTokenAddress: ${tokenAddress}`
            );
            await this._voteTransaction(
              sideFedContract,
              tokenAddress,
              crossFrom,
              receiver,
              amount,
              symbol,
              log.blockHash,
              log.transactionHash,
              log.logIndex,
              decimals,
              granularity,
              typeId,
              transactionId,
              federatorAddress,
              originChainId,
              destinationChainId
            );
          } else {
            this.logger.debug(
              `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${tokenAddress}  has already been voted by us`
            );
          }
        } else {
          this.logger.debug(
            `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${tokenAddress} was already processed`
          );
        }
      }

      return true;
    } catch (err) {
      throw new CustomError(`Exception processing logs`, err);
    }
  }

  async _voteTransaction(
    sideFedContract,
    tokenAddress,
    sender,
    receiver,
    amount,
    symbol,
    blockHash,
    transactionHash,
    logIndex,
    decimals,
    granularity,
    typeId,
    txId,
    federatorAddress,
    originChainId,
    destinationChainId
  ) {
    try {
      txId = txId.toLowerCase();
      this.logger.info(
        `TransactionId ${txId} Voting Transfer ${amount} of originalTokenAddress:${tokenAddress} trough sidechain bridge ${this.config.sidechain.bridge} to receiver ${receiver}`
      );

      const txDataAbi = await sideFedContract.getVoteTransactionABI({
        originalTokenAddress: tokenAddress,
        sender,
        receiver,
        amount,
        symbol,
        blockHash,
        transactionHash,
        logIndex,
        decimals,
        granularity,
        typeId,
        tokenType: utils.tokenType.COIN,
        originChainId,
        destinationChainId,
      });

      let revertedTxns = {};
      if (fs.existsSync(this.revertedTxnsPath)) {
        revertedTxns = JSON.parse(
          fs.readFileSync(this.revertedTxnsPath, "utf8")
        );
        this.logger.info(
          `read these transactions from reverted transactions file`,
          revertedTxns
        );
      }

      if (revertedTxns[txId]) {
        this.logger.info(
          `Skipping Voting ${amount} of originalTokenAddress:${tokenAddress} TransactionId ${txId} since it's marked as reverted.`,
          revertedTxns[txId]
        );
        return false;
      }

      this.logger.info(
        `Voting ${amount} of originalTokenAddress:${tokenAddress} TransactionId ${txId} was not reverted.`
      );

      const receipt = await this.transactionSender.sendTransaction(
        sideFedContract.getAddress(),
        txDataAbi,
        0,
        this.config.privateKey
      );

      if (receipt.status == false) {
        this.logger.info(
          `Voting ${amount} of originalTokenAddress:${tokenAddress} TransactionId ${txId} failed, check the receipt`,
          receipt
        );

        fs.writeFileSync(
          this.revertedTxnsPath,
          JSON.stringify({
            ...revertedTxns,
            [txId]: {
              originalTokenAddress: tokenAddress,
              sender,
              receiver,
              amount,
              symbol,
              blockHash,
              transactionHash,
              logIndex,
              decimals,
              granularity,
            },
          })
        );
      }

      await this.trackTransactionResultMetric(receipt.status, federatorAddress);

      return true;
    } catch (err) {
      throw new CustomError(
        `Exception Voting tx:${transactionHash} block: ${blockHash} originalTokenAddress: ${tokenAddress}`,
        err
      );
    }
  }

  async trackTransactionResultMetric(wasTransactionVoted, federatorAddress) {
    const federator = await this.federationFactory.getSideFederationContract();
    await this.metricCollector?.trackERC20FederatorVotingResult(
      wasTransactionVoted,
      federatorAddress,
      federator.getVersion(),
      await this.getCurrentChainId()
    );
  }

  _saveProgress(path, value) {
    if (value) {
      fs.writeFileSync(path, value.toString());
    }
  }
};
