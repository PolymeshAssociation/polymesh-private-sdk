import BigNumber from 'bignumber.js';

import {
  getAuthorization,
  Params,
  prepareRemoveCorporateActionsAgent,
} from '~/api/procedures/removeCorporateActionsAgent';
import { Context } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import { TxTags } from '~/types';
import * as utilsConversionModule from '~/utils/conversion';

jest.mock(
  '~/api/entities/Asset',
  require('~/testUtils/mocks/entities').mockAssetModule('~/api/entities/Asset')
);

describe('removeCorporateActionsAgent procedure', () => {
  let mockContext: Mocked<Context>;
  let ticker: string;
  let id: BigNumber;

  beforeAll(() => {
    dsMockUtils.initMocks();
    procedureMockUtils.initMocks();
    entityMockUtils.initMocks();
    ticker = 'SOME_TICKER';
  });

  beforeEach(() => {
    mockContext = dsMockUtils.getContextInstance();
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

  it('should return a remove corporate agent transaction spec', async () => {
    const did = 'someDid';

    entityMockUtils.configureMocks({
      assetOptions: {
        corporateActionsGetAgents: [entityMockUtils.getIdentityInstance({ did })],
      },
    });

    const rawTicker = dsMockUtils.createMockTicker(ticker);
    const rawIdentityId = dsMockUtils.createMockIdentityId(did);

    jest.spyOn(utilsConversionModule, 'stringToTicker').mockReturnValue(rawTicker);
    jest.spyOn(utilsConversionModule, 'stringToIdentityId').mockReturnValue(rawIdentityId);

    const transaction = dsMockUtils.createTxStub('externalAgents', 'removeAgent');
    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    const result = await prepareRemoveCorporateActionsAgent.call(proc, { ticker });

    expect(result).toEqual({ transaction, args: [rawTicker, rawIdentityId], resolver: undefined });
  });

  it('should throw an error if Corporate Actions Agent list has more than one Identity', () => {
    const args = {
      id,
      ticker,
    };

    entityMockUtils.configureMocks({
      assetOptions: {
        corporateActionsGetAgents: [
          entityMockUtils.getIdentityInstance({ did: 'did' }),
          entityMockUtils.getIdentityInstance({ did: 'otherDid' }),
        ],
      },
    });

    const proc = procedureMockUtils.getInstance<Params, void>(mockContext);

    return expect(prepareRemoveCorporateActionsAgent.call(proc, args)).rejects.toThrow(
      'There must be one (and only one) Corporate Actions Agent assigned to this Asset'
    );
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
          transactions: [TxTags.externalAgents.RemoveAgent],
          assets: [expect.objectContaining({ ticker })],
          portfolios: [],
        },
      });
    });
  });
});
