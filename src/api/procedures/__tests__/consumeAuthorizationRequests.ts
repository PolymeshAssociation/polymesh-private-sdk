import { u64 } from '@polkadot/types';
import BigNumber from 'bignumber.js';
import { AuthIdentifier } from 'polymesh-types/types';
import sinon from 'sinon';

import { AuthorizationRequest, Identity } from '~/api/entities';
import {
  ConsumeAuthorizationRequestsParams,
  isAuthorized,
  prepareConsumeAuthorizationRequests,
} from '~/api/procedures/consumeAuthorizationRequests';
import { Context } from '~/context';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import { Authorization, AuthorizationType } from '~/types';
import { AuthTarget } from '~/types/internal';
import * as utilsModule from '~/utils';

describe('consumeAuthorizationRequests procedure', () => {
  let mockContext: Mocked<Context>;
  let authTargetToAuthIdentifierStub: sinon.SinonStub<[AuthTarget, Context], AuthIdentifier>;
  let numberToU64Stub: sinon.SinonStub<[number | BigNumber, Context], u64>;
  let authParams: {
    authId: BigNumber;
    expiry: Date | null;
    issuerDid: string;
    targetDid: string;
    data: Authorization;
  }[];
  let auths: AuthorizationRequest[];
  let rawAuthIdentifiers: AuthIdentifier[];
  let rawAuthIds: u64[];

  beforeAll(() => {
    dsMockUtils.initMocks();
    procedureMockUtils.initMocks();
    entityMockUtils.initMocks();
    authTargetToAuthIdentifierStub = sinon.stub(utilsModule, 'authTargetToAuthIdentifier');
    numberToU64Stub = sinon.stub(utilsModule, 'numberToU64');
  });

  let addTransactionStub: sinon.SinonStub;

  beforeEach(() => {
    addTransactionStub = procedureMockUtils.getAddTransactionStub();
    mockContext = dsMockUtils.getContextInstance();
    authParams = [
      {
        authId: new BigNumber(1),
        expiry: new Date('10/14/3040'),
        targetDid: 'targetDid1',
        issuerDid: 'issuerDid1',
        data: {
          type: AuthorizationType.TransferAssetOwnership,
          value: 'someTicker1',
        },
      },
      {
        authId: new BigNumber(2),
        expiry: null,
        targetDid: 'targetDid2',
        issuerDid: 'issuerDid2',
        data: {
          type: AuthorizationType.TransferAssetOwnership,
          value: 'someTicker2',
        },
      },
      {
        authId: new BigNumber(3),
        expiry: new Date('10/14/1987'), // expired
        targetDid: 'targetDid3',
        issuerDid: 'issuerDid3',
        data: {
          type: AuthorizationType.TransferAssetOwnership,
          value: 'someTicker3',
        },
      },
    ];
    auths = [];
    rawAuthIds = [];
    rawAuthIdentifiers = [];
    authParams.forEach(params => {
      const { authId, targetDid } = params;

      auths.push(new AuthorizationRequest(params, mockContext));

      const rawAuthId = dsMockUtils.createMockU64(authId.toNumber());
      rawAuthIds.push(rawAuthId);
      numberToU64Stub.withArgs(authId, mockContext).returns(rawAuthId);

      const rawAuthIdentifier = dsMockUtils.createMockAuthIdentifier({
        // eslint-disable-next-line @typescript-eslint/camelcase
        auth_id: dsMockUtils.createMockU64(authId.toNumber()),
        signatory: dsMockUtils.createMockSignatory({
          Identity: dsMockUtils.createMockIdentityId(targetDid),
        }),
      });
      rawAuthIdentifiers.push(rawAuthIdentifier);
      authTargetToAuthIdentifierStub
        .withArgs({ authId, did: targetDid }, mockContext)
        .returns(rawAuthIdentifier);
    });
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

  test('should add a batch accept authorization transaction to the queue and ignore expired requests', async () => {
    const proc = procedureMockUtils.getInstance<ConsumeAuthorizationRequestsParams, void>(
      mockContext
    );

    const transaction = dsMockUtils.createTxStub('identity', 'batchAcceptAuthorization');

    await prepareConsumeAuthorizationRequests.call(proc, {
      accept: true,
      authRequests: auths,
    });

    const authIds = rawAuthIds.slice(0, -1);

    sinon.assert.calledWith(
      addTransactionStub,
      transaction,
      { batchSize: authIds.length },
      authIds
    );
  });

  test('should add a batch remove authorization transaction to the queue and ignore expired requests', async () => {
    const proc = procedureMockUtils.getInstance<ConsumeAuthorizationRequestsParams, void>(
      mockContext
    );

    const transaction = dsMockUtils.createTxStub('identity', 'batchRemoveAuthorization');

    await prepareConsumeAuthorizationRequests.call(proc, {
      accept: false,
      authRequests: auths,
    });

    const authIds = rawAuthIdentifiers.slice(0, -1);

    sinon.assert.calledWith(
      addTransactionStub,
      transaction,
      { batchSize: authIds.length },
      authIds
    );
  });

  describe('isAuthorized', () => {
    test('should return whether the current identity is the target of all non-expired requests if trying to accept', async () => {
      const proc = procedureMockUtils.getInstance<ConsumeAuthorizationRequestsParams, void>(
        mockContext
      );
      const { did } = await mockContext.getCurrentIdentity();
      const constructorParams = [
        {
          authId: new BigNumber(1),
          expiry: null,
          targetDid: did,
          issuerDid: 'issuerDid1',
          data: {
            type: AuthorizationType.NoData,
          } as Authorization,
        },
        {
          authId: new BigNumber(2),
          expiry: new Date('10/14/1987'), // expired
          targetDid: 'notTheCurrentIdentity',
          issuerDid: 'issuerDid2',
          data: {
            type: AuthorizationType.NoData,
          } as Authorization,
        },
      ];
      const args = {
        accept: true,
        authRequests: constructorParams.map(
          params => new AuthorizationRequest(params, mockContext)
        ),
      } as ConsumeAuthorizationRequestsParams;

      const boundFunc = isAuthorized.bind(proc);
      let result = await boundFunc(args);
      expect(result).toBe(true);

      args.authRequests[0].targetIdentity = new Identity(
        { did: 'notTheCurrentIdentity' },
        mockContext
      );

      result = await boundFunc(args);
      expect(result).toBe(false);
    });

    test('should return whether the current identity is the target or issuer of all non-expired requests if trying to remove', async () => {
      const proc = procedureMockUtils.getInstance<ConsumeAuthorizationRequestsParams, void>(
        mockContext
      );
      const { did } = await mockContext.getCurrentIdentity();
      const constructorParams = [
        {
          authId: new BigNumber(1),
          expiry: null,
          targetDid: did,
          issuerDid: 'notTheCurrentIdentity',
          data: {
            type: AuthorizationType.NoData,
          } as Authorization,
        },
        {
          authId: new BigNumber(2),
          expiry: new Date('10/14/3040'),
          targetDid: 'notTheCurrentIdentity',
          issuerDid: did,
          data: {
            type: AuthorizationType.NoData,
          } as Authorization,
        },
        {
          authId: new BigNumber(3),
          expiry: new Date('10/14/1987'), // expired
          targetDid: 'notTheCurrentIdentity',
          issuerDid: 'notTheCurrentIdentity',
          data: {
            type: AuthorizationType.NoData,
          } as Authorization,
        },
      ];
      const args = {
        accept: false,
        authRequests: constructorParams.map(
          params => new AuthorizationRequest(params, mockContext)
        ),
      } as ConsumeAuthorizationRequestsParams;

      const boundFunc = isAuthorized.bind(proc);
      let result = await boundFunc(args);
      expect(result).toBe(true);

      args.authRequests[0].targetIdentity = new Identity(
        { did: 'notTheCurrentIdentity' },
        mockContext
      );

      result = await boundFunc(args);
      expect(result).toBe(false);
    });
  });
});
