import { Balance } from '@polkadot/types/interfaces';
import BigNumber from 'bignumber.js';
import { Ticker, TxTags } from 'polymesh-types/types';
import sinon from 'sinon';

import { getAuthorization, IssueAssetParams, prepareIssueAsset } from '~/api/procedures/issueAsset';
import { Asset, Context } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import * as utilsConversionModule from '~/utils/conversion';

jest.mock(
  '~/api/entities/Asset',
  require('~/testUtils/mocks/entities').mockAssetModule('~/api/entities/Asset')
);

describe('issueAssets procedure', () => {
  let mockContext: Mocked<Context>;
  let stringToTickerStub: sinon.SinonStub<[string, Context], Ticker>;
  let numberToBalance: sinon.SinonStub;
  let ticker: string;
  let rawTicker: Ticker;
  let amount: BigNumber;
  let rawAmount: Balance;
  let addTransactionStub: sinon.SinonStub;

  beforeAll(() => {
    dsMockUtils.initMocks();
    procedureMockUtils.initMocks();
    entityMockUtils.initMocks();
    stringToTickerStub = sinon.stub(utilsConversionModule, 'stringToTicker');
    numberToBalance = sinon.stub(utilsConversionModule, 'numberToBalance');
    ticker = 'someTicker';
    rawTicker = dsMockUtils.createMockTicker(ticker);
    amount = new BigNumber(100);
    rawAmount = dsMockUtils.createMockBalance(amount.toNumber());
  });

  beforeEach(() => {
    mockContext = dsMockUtils.getContextInstance();
    stringToTickerStub.withArgs(ticker, mockContext).returns(rawTicker);
    addTransactionStub = procedureMockUtils.getAddTransactionStub();
  });

  afterEach(() => {
    entityMockUtils.reset();
    procedureMockUtils.reset();
    dsMockUtils.reset();
  });

  afterAll(() => {
    entityMockUtils.cleanup();
    procedureMockUtils.cleanup();
    dsMockUtils.cleanup();
  });

  test('should throw an error if Asset supply is bigger than the limit total supply', async () => {
    const args = {
      amount,
      ticker,
    };

    const limitTotalSupply = new BigNumber(Math.pow(10, 12));

    entityMockUtils.configureMocks({
      assetOptions: {
        details: {
          totalSupply: limitTotalSupply,
        },
      },
    });

    const proc = procedureMockUtils.getInstance<IssueAssetParams, Asset>(mockContext);

    let error;

    try {
      await prepareIssueAsset.call(proc, args);
    } catch (err) {
      error = err;
    }

    expect(error.message).toBe(
      `This issuance operation will cause the total supply of "${ticker}" to exceed the supply limit`
    );
    expect(error.data).toMatchObject({
      currentSupply: limitTotalSupply,
      supplyLimit: limitTotalSupply,
    });
  });

  test('should add a issue transaction to the queue', async () => {
    const isDivisible = true;
    const args = {
      amount,
      ticker,
    };

    entityMockUtils.configureMocks({
      assetOptions: {
        details: {
          isDivisible,
          primaryIssuanceAgents: [entityMockUtils.getIdentityInstance()],
        },
      },
    });

    numberToBalance.withArgs(amount, mockContext, isDivisible).returns(rawAmount);

    const transaction = dsMockUtils.createTxStub('asset', 'issue');
    const proc = procedureMockUtils.getInstance<IssueAssetParams, Asset>(mockContext);

    const result = await prepareIssueAsset.call(proc, args);

    sinon.assert.calledWith(addTransactionStub, transaction, {}, rawTicker, rawAmount);
    expect(result.ticker).toBe(ticker);
  });

  describe('getAuthorization', () => {
    test('should return the appropriate roles and permissions', () => {
      const proc = procedureMockUtils.getInstance<IssueAssetParams, Asset>(mockContext);
      const boundFunc = getAuthorization.bind(proc);
      const args = {
        ticker,
      } as IssueAssetParams;

      expect(boundFunc(args)).toEqual({
        permissions: {
          transactions: [TxTags.asset.Issue],
          assets: [entityMockUtils.getAssetInstance({ ticker })],
          portfolios: [],
        },
      });
    });
  });
});
