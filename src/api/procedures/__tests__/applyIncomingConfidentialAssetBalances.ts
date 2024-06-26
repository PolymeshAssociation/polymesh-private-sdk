import { u16 } from '@polkadot/types';
import { ErrorCode } from '@polymeshassociation/polymesh-sdk/types';
import BigNumber from 'bignumber.js';
import { when } from 'jest-when';

import {
  getAuthorization,
  prepareApplyIncomingConfidentialAssetBalances,
} from '~/api/procedures/applyIncomingConfidentialAssetBalances';
import { Context, PolymeshError } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import { ApplyIncomingConfidentialAssetBalancesParams, ConfidentialAccount, TxTags } from '~/types';
import * as utilsConversionModule from '~/utils/conversion';

describe('applyIncomingConfidentialAssetBalances procedure', () => {
  let mockContext: Mocked<Context>;
  let account: ConfidentialAccount;
  let maxUpdates: BigNumber;
  let rawMaxUpdates: u16;
  let args: ApplyIncomingConfidentialAssetBalancesParams;
  let bigNumberToU16Spy: jest.SpyInstance;

  beforeAll(() => {
    dsMockUtils.initMocks();
    procedureMockUtils.initMocks();
    entityMockUtils.initMocks();

    bigNumberToU16Spy = jest.spyOn(utilsConversionModule, 'bigNumberToU16');
  });

  beforeEach(() => {
    mockContext = dsMockUtils.getContextInstance();

    maxUpdates = new BigNumber(2);
    account = entityMockUtils.getConfidentialAccountInstance({
      getIncomingBalances: [
        {
          confidentialAsset: entityMockUtils.getConfidentialAssetInstance(),
          balance: 'some_encrypted_balance',
        },
      ],
    });
    rawMaxUpdates = dsMockUtils.createMockU16(maxUpdates);

    when(bigNumberToU16Spy).calledWith(maxUpdates, mockContext).mockReturnValue(rawMaxUpdates);

    args = {
      confidentialAccount: account,
      maxUpdates,
    };
  });

  afterEach(() => {
    entityMockUtils.reset();
    procedureMockUtils.reset();
    dsMockUtils.reset();
  });

  afterAll(() => {
    procedureMockUtils.cleanup();
    dsMockUtils.cleanup();
  });

  it('should throw an error if account is not owned by the signer', async () => {
    const proc = procedureMockUtils.getInstance<
      ApplyIncomingConfidentialAssetBalancesParams,
      ConfidentialAccount
    >(mockContext);

    const expectedError = new PolymeshError({
      code: ErrorCode.UnmetPrerequisite,
      message: 'The Signing Identity cannot apply incoming balances in the specified account',
    });

    await expect(
      prepareApplyIncomingConfidentialAssetBalances.call(proc, {
        ...args,
        confidentialAccount: entityMockUtils.getConfidentialAccountInstance({
          getIdentity: null,
        }),
      })
    ).rejects.toThrowError(expectedError);

    await expect(
      prepareApplyIncomingConfidentialAssetBalances.call(proc, {
        ...args,
        confidentialAccount: entityMockUtils.getConfidentialAccountInstance({
          getIdentity: entityMockUtils.getIdentityInstance({
            did: 'someRandomDid',
          }),
        }),
      })
    ).rejects.toThrowError(expectedError);
  });

  it('should throw an error if no incoming balances are present', async () => {
    const proc = procedureMockUtils.getInstance<
      ApplyIncomingConfidentialAssetBalancesParams,
      ConfidentialAccount
    >(mockContext);

    const expectedError = new PolymeshError({
      code: ErrorCode.DataUnavailable,
      message: 'No incoming balance found for the given confidential Account',
    });

    await expect(
      prepareApplyIncomingConfidentialAssetBalances.call(proc, {
        ...args,
        confidentialAccount: entityMockUtils.getConfidentialAccountInstance(),
      })
    ).rejects.toThrowError(expectedError);
  });

  it('should return a apply incoming balances transaction spec', async () => {
    const transaction = dsMockUtils.createTxMock('confidentialAsset', 'applyIncomingBalances');
    const proc = procedureMockUtils.getInstance<
      ApplyIncomingConfidentialAssetBalancesParams,
      ConfidentialAccount
    >(mockContext);

    let result = await prepareApplyIncomingConfidentialAssetBalances.call(proc, args);
    expect(result).toEqual({
      transaction,
      args: [account.publicKey, rawMaxUpdates],
      resolver: expect.objectContaining({ publicKey: account.publicKey }),
    });

    // maxUpdates to equal all incoming balances length
    const newMaxUpdates = new BigNumber(1);
    const rawNewMaxUpdates = dsMockUtils.createMockU16(newMaxUpdates);
    when(bigNumberToU16Spy)
      .calledWith(newMaxUpdates, mockContext)
      .mockReturnValue(rawNewMaxUpdates);

    result = await prepareApplyIncomingConfidentialAssetBalances.call(proc, {
      ...args,
      maxUpdates: undefined,
    });
    expect(result).toEqual({
      transaction,
      args: [account.publicKey, rawNewMaxUpdates],
      resolver: expect.objectContaining({ publicKey: account.publicKey }),
    });
  });

  describe('getAuthorization', () => {
    it('should return the appropriate roles and permissions', () => {
      const proc = procedureMockUtils.getInstance<
        ApplyIncomingConfidentialAssetBalancesParams,
        ConfidentialAccount
      >(mockContext);
      const boundFunc = getAuthorization.bind(proc);

      expect(boundFunc()).toEqual({
        permissions: {
          transactions: [TxTags.confidentialAsset.ApplyIncomingBalances],
          assets: [],
          portfolios: [],
        },
      });
    });
  });
});
