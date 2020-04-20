import { Balance } from '@polkadot/types/interfaces';
import BigNumber from 'bignumber.js';
import sinon from 'sinon';

import { Identity } from '~/api/entities/Identity';
import { Namespace } from '~/base';
import { IdentityId, Ticker } from '~/polkadot';
import { entityMockUtils, polkadotMockUtils } from '~/testUtils/mocks';
import { tuple } from '~/types/utils';
import * as utilsModule from '~/utils';

import { IdentityBalance, TokenHolders } from '../TokenHolders';

describe('TokenHolders class', () => {
  beforeAll(() => {
    entityMockUtils.initMocks();
    polkadotMockUtils.initMocks();
  });

  afterEach(() => {
    entityMockUtils.reset();
    polkadotMockUtils.reset();
  });

  afterAll(() => {
    entityMockUtils.cleanup();
    polkadotMockUtils.cleanup();
  });

  test('should extend namespace', () => {
    expect(TokenHolders.prototype instanceof Namespace).toBe(true);
  });

  describe('method: get', () => {
    afterAll(() => {
      sinon.restore();
    });

    test('should retrieve all the token holders with balance', async () => {
      const ticker = 'TEST';
      const mockContext = polkadotMockUtils.getContextInstance();
      const rawTicker = polkadotMockUtils.createMockTicker(ticker);
      const fakeData = [
        {
          identity: 'someIdentity',
          value: 1000,
        },
        {
          identity: 'otherIdentity',
          value: 2000,
        },
      ];

      const expectedHolders: IdentityBalance[] = [];

      sinon
        .stub(utilsModule, 'stringToTicker')
        .withArgs(ticker, mockContext)
        .returns(rawTicker);

      const identityIdToStringStub = sinon.stub(utilsModule, 'identityIdToString');
      const balanceToBigNumberStub = sinon.stub(utilsModule, 'balanceToBigNumber');

      const identityIds: IdentityId[] = [];
      const balances: Balance[] = [];
      const balanceOfEntries: [Ticker[], Balance][] = [];

      const context = polkadotMockUtils.getContextInstance();

      fakeData.forEach(({ identity, value }) => {
        const identityId = polkadotMockUtils.createMockIdentityId(identity);
        const fakeBalance = polkadotMockUtils.createMockBalance(value);
        const balance = new BigNumber(value);

        identityIds.push(identityId);
        balances.push(fakeBalance);

        identityIdToStringStub.withArgs(identityId).returns(identity);
        balanceToBigNumberStub.withArgs(fakeBalance).returns(balance);

        balanceOfEntries.push(tuple([rawTicker, identityId], fakeBalance));

        expectedHolders.push({
          identity: new Identity({ did: identity }, context),
          balance,
        });
      });

      polkadotMockUtils.createQueryStub('asset', 'balanceOf', {
        entries: balanceOfEntries,
      });

      const token = entityMockUtils.getSecurityTokenInstance();
      const tokenHolders = new TokenHolders(token, context);

      const result = await tokenHolders.get();

      expect(result).toEqual(expectedHolders);
    });
  });
});
