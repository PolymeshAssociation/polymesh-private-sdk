import BigNumber from 'bignumber.js';
import { when } from 'jest-when';
import { Ticker } from 'polymesh-types/types';

import {
  getAuthorization,
  Params,
  prepareModifyCaDefaultConfig,
} from '~/api/procedures/modifyCaDefaultConfig';
import * as utilsProcedureModule from '~/api/procedures/utils';
import { Context } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import { InputTargets, TargetTreatment, TxTags } from '~/types';
import * as utilsConversionModule from '~/utils/conversion';

jest.mock(
  '~/api/entities/Asset',
  require('~/testUtils/mocks/entities').mockAssetModule('~/api/entities/Asset')
);

describe('modifyCaDefaultConfig procedure', () => {
  let mockContext: Mocked<Context>;
  let stringToTickerStub: jest.SpyInstance;
  let targetsToTargetIdentitiesStub: jest.SpyInstance;
  let percentageToPermillStub: jest.SpyInstance;
  let stringToIdentityIdStub: jest.SpyInstance;

  let assertCaTaxWithholdingsValidStub: jest.SpyInstance;

  let ticker: string;
  let rawTicker: Ticker;

  beforeAll(() => {
    dsMockUtils.initMocks();
    procedureMockUtils.initMocks();
    entityMockUtils.initMocks();
    stringToTickerStub = jest.spyOn(utilsConversionModule, 'stringToTicker');
    targetsToTargetIdentitiesStub = jest.spyOn(utilsConversionModule, 'targetsToTargetIdentities');
    percentageToPermillStub = jest.spyOn(utilsConversionModule, 'percentageToPermill');
    stringToIdentityIdStub = jest.spyOn(utilsConversionModule, 'stringToIdentityId');
    ticker = 'SOME_TICKER';
    rawTicker = dsMockUtils.createMockTicker(ticker);
    assertCaTaxWithholdingsValidStub = jest.spyOn(
      utilsProcedureModule,
      'assertCaTaxWithholdingsValid'
    );
    assertCaTaxWithholdingsValidStub.mockImplementation();
  });

  beforeEach(() => {
    mockContext = dsMockUtils.getContextInstance();
    when(stringToTickerStub).calledWith(ticker, mockContext).mockReturnValue(rawTicker);
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

  it('should throw an error if the user has not passed any arguments', () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    return expect(prepareModifyCaDefaultConfig.call(proc, {} as unknown as Params)).rejects.toThrow(
      'Nothing to modify'
    );
  });

  it('should throw an error if the new targets are the same as the current ones', () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const targets = {
      identities: [],
      treatment: TargetTreatment.Exclude,
    };
    entityMockUtils.configureMocks({
      assetOptions: { corporateActionsGetDefaultConfig: { targets } },
    });

    return expect(
      prepareModifyCaDefaultConfig.call(proc, {
        ticker,
        targets,
      })
    ).rejects.toThrow('New targets are the same as the current ones');
  });

  it('should throw an error if the new default tax withholding is the same as the current one', () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const defaultTaxWithholding = new BigNumber(10);
    entityMockUtils.configureMocks({
      assetOptions: { corporateActionsGetDefaultConfig: { defaultTaxWithholding } },
    });

    return expect(
      prepareModifyCaDefaultConfig.call(proc, {
        ticker,
        defaultTaxWithholding,
      })
    ).rejects.toThrow('New default tax withholding is the same as the current one');
  });

  it('should throw an error if the new tax withholdings are the same as the current ones', () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const taxWithholdings = [
      {
        identity: entityMockUtils.getIdentityInstance({ did: 'someDid' }),
        percentage: new BigNumber(15),
      },
    ];
    entityMockUtils.configureMocks({
      assetOptions: { corporateActionsGetDefaultConfig: { taxWithholdings } },
    });

    return expect(
      prepareModifyCaDefaultConfig.call(proc, {
        ticker,
        taxWithholdings,
      })
    ).rejects.toThrow('New per-Identity tax withholding percentages are the same as current ones');
  });

  it('should throw an error if the new tax withholding entries exceed the maximum amount', () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const taxWithholdings = [
      {
        identity: entityMockUtils.getIdentityInstance({ did: 'someDid' }),
        percentage: new BigNumber(15),
      },
    ];
    entityMockUtils.configureMocks({
      assetOptions: { corporateActionsGetDefaultConfig: { taxWithholdings } },
    });

    when(assertCaTaxWithholdingsValidStub)
      .calledWith(taxWithholdings, mockContext)
      .mockImplementation(() => {
        throw new Error('err');
      });

    return expect(
      prepareModifyCaDefaultConfig.call(proc, {
        ticker,
        taxWithholdings,
      })
    ).rejects.toThrow();
  });

  it('should add a set default targets transaction to the batch', async () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const transaction = dsMockUtils.createTxStub('corporateAction', 'setDefaultTargets');

    let targets: InputTargets = {
      identities: [],
      treatment: TargetTreatment.Exclude,
    };

    entityMockUtils.configureMocks({
      assetOptions: {
        corporateActionsGetDefaultConfig: {
          targets: {
            identities: [entityMockUtils.getIdentityInstance({ did: 'someDid' })],
            treatment: TargetTreatment.Include,
          },
        },
      },
    });

    let rawTargets = dsMockUtils.createMockTargetIdentities({
      identities: [],
      treatment: 'Exclude',
    });
    when(targetsToTargetIdentitiesStub)
      .calledWith(targets, mockContext)
      .mockReturnValue(rawTargets);

    let result = await prepareModifyCaDefaultConfig.call(proc, {
      ticker,
      targets,
    });

    expect(result).toEqual({
      transactions: [{ transaction, args: [rawTicker, rawTargets] }],
      resolver: undefined,
    });

    rawTargets = dsMockUtils.createMockTargetIdentities({
      identities: ['someDid', 'otherDid'],
      treatment: 'Exclude',
    });

    targets = {
      identities: ['someDid', 'otherDid'],
      treatment: TargetTreatment.Exclude,
    };
    when(targetsToTargetIdentitiesStub)
      .calledWith(targets, mockContext)
      .mockReturnValue(rawTargets);

    result = await prepareModifyCaDefaultConfig.call(proc, {
      ticker,
      targets,
    });

    expect(result).toEqual({
      transactions: [{ transaction, args: [rawTicker, rawTargets] }],
      resolver: undefined,
    });
  });

  it('should add a set default withholding tax transaction to the batch', async () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const transaction = dsMockUtils.createTxStub('corporateAction', 'setDefaultWithholdingTax');

    entityMockUtils.configureMocks({
      assetOptions: {
        corporateActionsGetDefaultConfig: {
          defaultTaxWithholding: new BigNumber(10),
        },
      },
    });

    const rawPercentage = dsMockUtils.createMockPermill(new BigNumber(150000));
    when(percentageToPermillStub)
      .calledWith(new BigNumber(15), mockContext)
      .mockReturnValue(rawPercentage);

    const result = await prepareModifyCaDefaultConfig.call(proc, {
      ticker,
      defaultTaxWithholding: new BigNumber(15),
    });

    expect(result).toEqual({
      transactions: [{ transaction, args: [rawTicker, rawPercentage] }],
      resolver: undefined,
    });
  });

  it('should add a batch of set did withholding tax transactions to the batch', async () => {
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const transaction = dsMockUtils.createTxStub('corporateAction', 'setDidWithholdingTax');

    entityMockUtils.configureMocks({
      assetOptions: {
        corporateActionsGetDefaultConfig: {
          taxWithholdings: [],
        },
      },
    });

    const rawDid = dsMockUtils.createMockIdentityId('someDid');
    const rawPercentage = dsMockUtils.createMockPermill(new BigNumber(250000));

    when(stringToIdentityIdStub).calledWith('someDid', mockContext).mockReturnValue(rawDid);
    when(percentageToPermillStub)
      .calledWith(new BigNumber(25), mockContext)
      .mockReturnValue(rawPercentage);

    const taxWithholdings = [
      {
        identity: 'someDid',
        percentage: new BigNumber(25),
      },
    ];
    const result = await prepareModifyCaDefaultConfig.call(proc, {
      ticker,
      taxWithholdings,
    });

    expect(assertCaTaxWithholdingsValidStub).toHaveBeenCalledWith(taxWithholdings, mockContext);
    expect(result).toEqual({
      transactions: [
        {
          transaction,
          args: [rawTicker, rawDid, rawPercentage],
        },
      ],
      resolver: undefined,
    });
  });

  describe('getAuthorization', () => {
    it('should return the appropriate roles and permissions', () => {
      const proc = procedureMockUtils.getInstance<Params, void>(mockContext);
      const boundFunc = getAuthorization.bind(proc);
      const args = {
        ticker,
      } as Params;

      expect(boundFunc(args)).toEqual({
        permissions: {
          transactions: [],
          portfolios: [],
          assets: [expect.objectContaining({ ticker })],
        },
      });

      expect(
        boundFunc({
          ...args,
          targets: { identities: [], treatment: TargetTreatment.Include },
          defaultTaxWithholding: new BigNumber(10),
          taxWithholdings: [],
        })
      ).toEqual({
        permissions: {
          transactions: [
            TxTags.corporateAction.SetDefaultTargets,
            TxTags.corporateAction.SetDefaultWithholdingTax,
            TxTags.corporateAction.SetDidWithholdingTax,
          ],
          portfolios: [],
          assets: [expect.objectContaining({ ticker })],
        },
      });
    });
  });
});
