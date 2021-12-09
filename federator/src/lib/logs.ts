import log4js from 'log4js';
import { LogWrapper } from './logWrapper';
import logConfig from '../../config/log-config.json';

export const LOGGER_CATEGORY_TEST_INTEGRATION = 'test';
export const LOGGER_CATEGORY_TEST_FEDERATOR = 'FEDERATOR';
export const LOGGER_CATEGORY_TEST_FEDERATOR_NFT = 'NFT FEDERATOR';
export const LOGGER_CATEGORY_HEARTBEAT = 'HEARTBEAT';
export const LOGGER_CATEGORY_FEDERATOR = 'Federators';
export const LOGGER_CATEGORY_FEDERATOR_FUND = 'Fund Federators';
export const LOGGER_CATEGORY_FEDERATOR_MAIN = 'MAIN-FEDERATOR';
export const LOGGER_CATEGORY_FEDERATOR_SIDE = 'SIDE-FEDERATOR';
export const LOGGER_CATEGORY_FEDERATOR_NFT_MAIN = 'MAIN-NFT-FEDERATOR';
export const LOGGER_CATEGORY_FEDERATOR_NFT_SIDE = 'SIDE-NFT-FEDERATOR';
const LOGGER_CATEGORY_DEFAULT = 'default';

export class Logs {
  private readonly logMap: Map<string, LogWrapper>;
  private readonly globalContext: Map<string, any>;
  private currentLogger: LogWrapper;
  private static instance: Logs;

  private constructor() {
    this.logMap = new Map();
    this.globalContext = new Map();
    log4js.configure(logConfig);
    const defaultLogger = new LogWrapper(log4js.getLogger(LOGGER_CATEGORY_DEFAULT), LOGGER_CATEGORY_DEFAULT);
    this.currentLogger = defaultLogger;
    this.logMap.set(LOGGER_CATEGORY_DEFAULT, defaultLogger);
  }

  public static getInstance(): Logs {
    if (!Logs.instance) {
      Logs.instance = new Logs();
    }
    return Logs.instance;
  }

  upsertContext(key: string, value: any): void {
    this.globalContext.set(key, value);
  }

  removeContext(key: string): boolean {
    return this.globalContext.delete(key);
  }

  clearContext(): void {
    this.globalContext.clear();
  }

  getGlobalContextData(): any[] {
    if (this.globalContext.size <= 0) {
      return [];
    }
    return ['Global Context Map:', this.globalContext];
  }

  getGlobalContextSize(): number {
    return this.globalContext.size;
  }

  getLogger(key: string): LogWrapper {
    if (this.currentLogger.key === key) {
      return this.currentLogger;
    }

    if (this.logMap.has(key)) {
      const newCurrentLogger = this.logMap.get(key);
      this.currentLogger = newCurrentLogger;
      return newCurrentLogger;
    }

    const newLogger = new LogWrapper(log4js.getLogger(key), key);
    this.logMap.set(key, newLogger);
    this.currentLogger = newLogger;
    return newLogger;
  }

  getCurrentLogger(): LogWrapper {
    return this.currentLogger;
  }

  newLog4jsConfig(log4jsConfig: log4js.Configuration): void {
    log4js.configure(log4jsConfig);
  }
}
