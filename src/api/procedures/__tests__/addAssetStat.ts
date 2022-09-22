import {
  PolymeshPrimitivesIdentityClaimClaimType,
  PolymeshPrimitivesIdentityId,
  PolymeshPrimitivesStatisticsStat2ndKey,
  PolymeshPrimitivesStatisticsStatOpType,
  PolymeshPrimitivesStatisticsStatType,
  PolymeshPrimitivesStatisticsStatUpdate,
  PolymeshPrimitivesTicker,
  PolymeshPrimitivesTransferComplianceTransferCondition,
} from '@polkadot/types/lookup';
import { BTreeSet } from '@polkadot/types-codec';
import BigNumber from 'bignumber.js';
import { when } from 'jest-when';

import { getAuthorization, prepareAddAssetStat } from '~/api/procedures/addAssetStat';
import { Context, PolymeshError } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import {
  AddAssetStatParams,
  ClaimType,
  CountryCode,
  ErrorCode,
  StatClaimType,
  TxTags,
} from '~/types';
import { PolymeshTx, StatType, TickerKey } from '~/types/internal';
import * as utilsConversionModule from '~/utils/conversion';

jest.mock(
  '~/api/entities/Asset',
  require('~/testUtils/mocks/entities').mockAssetModule('~/api/entities/Asset')
);

describe('addAssetStat procedure', () => {
  let mockContext: Mocked<Context>;
  let stringToTickerKeyStub: jest.SpyInstance<TickerKey, [string, Context]>;
  let ticker: string;
  let count: BigNumber;
  let rawTicker: PolymeshPrimitivesTicker;
  let args: AddAssetStatParams;
  let rawStatType: PolymeshPrimitivesStatisticsStatType;
  let rawStatBtreeSet: BTreeSet<PolymeshPrimitivesStatisticsStatType>;
  let rawStatUpdate: PolymeshPrimitivesStatisticsStatUpdate;
  let raw2ndKey: PolymeshPrimitivesStatisticsStat2ndKey;

  let setActiveAssetStatsTxStub: PolymeshTx<
    [PolymeshPrimitivesTicker, PolymeshPrimitivesTransferComplianceTransferCondition]
  >;
  let batchUpdateAssetStatsTxStub: PolymeshTx<
    [
      PolymeshPrimitivesTicker,
      PolymeshPrimitivesStatisticsStatType,
      BTreeSet<PolymeshPrimitivesStatisticsStatUpdate>
    ]
  >;
  let statisticsOpTypeToStatOpTypeStub: jest.SpyInstance<
    PolymeshPrimitivesStatisticsStatType,
    [
      {
        op: PolymeshPrimitivesStatisticsStatOpType;
        claimIssuer?: [PolymeshPrimitivesIdentityClaimClaimType, PolymeshPrimitivesIdentityId];
      },
      Context
    ]
  >;
  let statisticStatTypesToBtreeStatTypeStub: jest.SpyInstance<
    BTreeSet<PolymeshPrimitivesStatisticsStatType>,
    [PolymeshPrimitivesStatisticsStatType[], Context]
  >;
  let statUpdatesToBtreeStatUpdateStub: jest.SpyInstance<
    BTreeSet<PolymeshPrimitivesStatisticsStatUpdate>,
    [PolymeshPrimitivesStatisticsStatUpdate[], Context]
  >;
  let createStat2ndKeyStub: jest.SpyInstance<
    PolymeshPrimitivesStatisticsStat2ndKey,
    [
      type: 'NoClaimStat' | StatClaimType,
      context: Context,
      claimStat?: CountryCode | 'yes' | 'no' | undefined
    ]
  >;
  let statUpdateBtreeSet: BTreeSet<PolymeshPrimitivesStatisticsStatUpdate>;
  let activeAssetStatsStub: jest.Mock;
  let statStub: jest.SpyInstance;

  beforeAll(() => {
    dsMockUtils.initMocks();
    procedureMockUtils.initMocks();
    entityMockUtils.initMocks();
    mockContext = dsMockUtils.getContextInstance();
    ticker = 'TICKER';
    count = new BigNumber(10);
    stringToTickerKeyStub = jest.spyOn(utilsConversionModule, 'stringToTickerKey');
    createStat2ndKeyStub = jest.spyOn(utilsConversionModule, 'createStat2ndKey');
    statisticsOpTypeToStatOpTypeStub = jest.spyOn(
      utilsConversionModule,
      'statisticsOpTypeToStatType'
    );
    statUpdatesToBtreeStatUpdateStub = jest.spyOn(
      utilsConversionModule,
      'statUpdatesToBtreeStatUpdate'
    );
    dsMockUtils.setConstMock('statistics', 'maxTransferConditionsPerAsset', {
      returnValue: dsMockUtils.createMockU32(new BigNumber(3)),
    });
    statStub = jest.spyOn(utilsConversionModule, 'meshStatToStatType');
    activeAssetStatsStub = dsMockUtils.createQueryStub('statistics', 'activeAssetStats');
    activeAssetStatsStub.mockReturnValue(dsMockUtils.createMockBTreeSet([]));
    statisticStatTypesToBtreeStatTypeStub = jest.spyOn(
      utilsConversionModule,
      'statisticStatTypesToBtreeStatType'
    );
  });

  beforeEach(() => {
    statStub.mockReturnValue(StatType.Balance);
    setActiveAssetStatsTxStub = dsMockUtils.createTxStub('statistics', 'setActiveAssetStats');
    batchUpdateAssetStatsTxStub = dsMockUtils.createTxStub('statistics', 'batchUpdateAssetStats');

    rawStatType = dsMockUtils.createMockStatisticsStatType();
    rawStatBtreeSet = dsMockUtils.createMockBTreeSet([rawStatType]);
    rawTicker = dsMockUtils.createMockTicker(ticker);
    rawStatUpdate = dsMockUtils.createMockStatUpdate();
    statUpdateBtreeSet = dsMockUtils.createMockBTreeSet([rawStatUpdate]);

    when(createStat2ndKeyStub)
      .calledWith('NoClaimStat', mockContext, undefined)
      .mockReturnValue(raw2ndKey);
    when(statUpdatesToBtreeStatUpdateStub)
      .calledWith([rawStatUpdate], mockContext)
      .mockReturnValue(statUpdateBtreeSet);
    statisticsOpTypeToStatOpTypeStub.mockReturnValue(rawStatType);

    when(stringToTickerKeyStub)
      .calledWith(ticker, mockContext)
      .mockReturnValue({ Ticker: rawTicker });
    statisticStatTypesToBtreeStatTypeStub.mockReturnValue(rawStatBtreeSet);
  });

  afterEach(() => {
    entityMockUtils.reset();
    procedureMockUtils.reset();
    dsMockUtils.reset();
  });

  afterAll(() => {
    procedureMockUtils.cleanup();
    dsMockUtils.cleanup();
    jest.restoreAllMocks();
  });

  it('should add an setAssetStats transaction to the queue', async () => {
    args = {
      type: StatType.Balance,
      ticker,
    };
    const proc = procedureMockUtils.getInstance<AddAssetStatParams, void>(mockContext, {});

    let result = await prepareAddAssetStat.call(proc, args);

    expect(result).toEqual({
      transactions: [
        {
          transaction: setActiveAssetStatsTxStub,
          args: [{ Ticker: rawTicker }, rawStatBtreeSet],
        },
      ],
      resolver: undefined,
    });

    args = {
      type: StatType.Count,
      ticker,
      count,
    };

    jest
      .spyOn(utilsConversionModule, 'countStatInputToStatUpdates')
      .mockReturnValue(statUpdateBtreeSet);
    result = await prepareAddAssetStat.call(proc, args);

    expect(result).toEqual({
      transactions: [
        {
          transaction: setActiveAssetStatsTxStub,
          args: [{ Ticker: rawTicker }, rawStatBtreeSet],
        },
        {
          transaction: batchUpdateAssetStatsTxStub,
          args: [{ Ticker: rawTicker }, rawStatType, statUpdateBtreeSet],
        },
      ],
      resolver: undefined,
    });

    args = {
      type: StatType.ScopedCount,
      ticker,
      issuer: entityMockUtils.getIdentityInstance(),
      claimType: ClaimType.Accredited,
      value: {
        accredited: new BigNumber(1),
        nonAccredited: new BigNumber(2),
      },
    };

    jest
      .spyOn(utilsConversionModule, 'claimCountStatInputToStatUpdates')
      .mockReturnValue(statUpdateBtreeSet);

    result = await prepareAddAssetStat.call(proc, args);

    expect(result).toEqual({
      transactions: [
        {
          transaction: setActiveAssetStatsTxStub,
          args: [{ Ticker: rawTicker }, rawStatBtreeSet],
        },
        {
          transaction: batchUpdateAssetStatsTxStub,
          args: [{ Ticker: rawTicker }, rawStatType, statUpdateBtreeSet],
        },
      ],
      resolver: undefined,
    });
  });

  it('should throw an error if the appropriate stat is not set', () => {
    const proc = procedureMockUtils.getInstance<AddAssetStatParams, void>(mockContext, {});
    args = {
      type: StatType.Balance,
      ticker,
    };

    activeAssetStatsStub.mockReturnValue([rawStatType]);

    statStub.mockReturnValue(StatType.Balance);

    const expectedError = new PolymeshError({
      code: ErrorCode.NoDataChange,
      message: 'Stat is already enabled',
    });

    return expect(prepareAddAssetStat.call(proc, args)).rejects.toThrowError(expectedError);
  });

  describe('getAuthorization', () => {
    it('should return the appropriate roles and permissions', () => {
      args = {
        ticker,
        count,
        type: StatType.Count,
      };

      const proc = procedureMockUtils.getInstance<AddAssetStatParams, void>(mockContext);
      const boundFunc = getAuthorization.bind(proc);

      expect(boundFunc(args)).toEqual({
        permissions: {
          assets: [expect.objectContaining({ ticker })],
          transactions: [
            TxTags.statistics.SetActiveAssetStats,
            TxTags.statistics.BatchUpdateAssetStats,
          ],
          portfolios: [],
        },
      });
      expect(boundFunc({ ticker, type: StatType.Balance })).toEqual({
        permissions: {
          assets: [expect.objectContaining({ ticker })],
          transactions: [TxTags.statistics.SetActiveAssetStats],
          portfolios: [],
        },
      });
    });
  });
});
