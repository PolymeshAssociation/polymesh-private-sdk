import BigNumber from 'bignumber.js';
import { TxTags } from 'polymesh-types/types';

export const MAX_DECIMALS = 6;
export const MAX_TICKER_LENGTH = 12;
export const MAX_MODULE_LENGTH = 32;
export const MAX_TOKEN_AMOUNT = new BigNumber(Math.pow(10, 12));
export const DUMMY_ACCOUNT_ID = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
export const MAX_BATCH_ELEMENTS = {
  [TxTags.asset.BatchIssue]: 200,
  [TxTags.asset.BatchAddDocument]: 20,
  [TxTags.asset.BatchRemoveDocument]: 20,
  [TxTags.identity.BatchAcceptAuthorization]: 100,

  [TxTags.identity.BatchRemoveAuthorization]: 100,
  [TxTags.identity.BatchAddClaim]: 200,
  [TxTags.identity.BatchRevokeClaim]: 200,
  [TxTags.complianceManager.BatchRemoveDefaultTrustedClaimIssuer]: 200,
  [TxTags.complianceManager.BatchAddDefaultTrustedClaimIssuer]: 200,
};
export const IGNORE_CHECKSUM = true;
export const SS58_FORMAT = 42;
export const MAX_CONCURRENT_REQUESTS = 200;
export const TREASURY_MODULE_ADDRESS = 'modlpm/trsry';
export const BATCH_REGEX = RegExp('^batch');
