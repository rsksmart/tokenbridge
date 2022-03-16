import { ConfirmationsReturn } from './IAllowTokensV0';
import { GetLimitsParams } from './IAllowTokensV1';

export interface IAllowTokens {
  getVersion(): string;

  getConfirmations(): Promise<ConfirmationsReturn>;

  getLimits(objParams: GetLimitsParams): any;
}
