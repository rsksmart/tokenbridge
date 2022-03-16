import { Logger } from 'log4js';
import { Logs } from './logs';

export class LogWrapper {
  logger: Logger;
  key: string;
  context: Map<string, any>;

  constructor(logger: Logger, key: string) {
    this.logger = logger;
    this.key = key;
    this.context = new Map();
  }

  upsertContext(key: string, value: any): void {
    this.context.set(key, value);
  }

  removeContext(key: string): boolean {
    return this.context.delete(key);
  }

  clearContext(): void {
    this.context.clear();
  }

  getContextData(): any[] {
    return [...Logs.getInstance().getGlobalContextData(), this.key, 'Context Map:', this.context];
  }

  trace(message: any, ...args: any[]): void {
    if (this.context.size > 0) {
      return this.logger.trace(message, ...args, ...this.getContextData());
    }
    return this.logger.trace(message, ...args);
  }

  debug(message: any, ...args: any[]): void {
    if (this.context.size > 0) {
      return this.logger.debug(message, ...args, ...this.getContextData());
    }
    return this.logger.debug(message, ...args);
  }

  info(message: any, ...args: any[]): void {
    if (this.context.size > 0) {
      return this.logger.info(message, ...args, ...this.getContextData());
    }
    return this.logger.info(message, ...args);
  }

  warn(message: any, ...args: any[]): void {
    if (this.context.size > 0) {
      return this.logger.warn(message, ...args, ...this.getContextData());
    }
    return this.logger.warn(message, ...args);
  }

  error(message: any, ...args: any[]): void {
    if (this.context.size > 0) {
      return this.logger.error(message, ...args, ...this.getContextData());
    }
    return this.logger.error(message, ...args);
  }

  fatal(message: any, ...args: any[]): void {
    if (this.context.size > 0) {
      return this.logger.fatal(message, ...args, ...this.getContextData());
    }
    return this.logger.fatal(message, ...args);
  }
}
