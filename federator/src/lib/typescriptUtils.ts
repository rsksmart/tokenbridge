import { LogWrapper } from "./logWrapper";

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retryNTimes = async (toTry: Promise<any>, retryCounter:RetryCounter = new RetryCounter(), intervalInMs = 1000) => {
  while (retryCounter.hasAttempts()) {
    try {
      retryCounter.useAttempt();
      return await toTry;
    } catch (error) {
      if (!retryCounter.hasAttempts()) {
        throw error;
      }
    }
    await sleep(intervalInMs);
  }
  throw new Error(`Failed to obtain result after ${retryCounter.initialAttempts} retries`);
};

export class RetryCounter {
  private static readonly DEFAULT_ATTEMPTS = 3;
  private attempts:number;
  private _initialAttempts:number;
  private _infiniteAttempts:boolean;
  private log?:LogWrapper;

  constructor(args?:{ attempts?:number, log?:LogWrapper }) {
    this.log = args?.log
    const envAttempts = parseInt(process.env.ENV_DEFAULT_ATTEMPTS);
    if (args?.attempts !== undefined) {
      this.setAttempts(args.attempts);
    } else if (envAttempts !== undefined && !isNaN(envAttempts)) {
      this.setAttempts(envAttempts);
    } else {
      this.setAttempts(RetryCounter.DEFAULT_ATTEMPTS);
    }
  }

  private setAttempts(attempts:number) {
    if (attempts < 0) {
      throw new Error('negative numbers are not allowed');
    }
    this._infiniteAttempts = attempts === 0;
    this._initialAttempts = attempts
    this.attempts = this.initialAttempts;
  }

  get infiniteAttempts(): boolean {
    return this._infiniteAttempts;
  }

  get initialAttempts(): number {
    return this._initialAttempts;
  }

  hasAttempts(): boolean {
    if (this.infiniteAttempts && this.log !== undefined) {
      this.log.warn('Using infinite retries on counter')
    }
    return this.infiniteAttempts || this.attempts !== 0;
  }

  useAttempt(): void {
    if (!this.infiniteAttempts) {
      this.attempts--;
    }
  }

  attemptsLeft(): number {
    return this.attempts
  }

  reset(): void {
    if (!this.infiniteAttempts) {
      this.attempts = this.initialAttempts;
    }
  }
}