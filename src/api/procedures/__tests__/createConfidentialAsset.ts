import { PalletConfidentialAssetConfidentialAuditors } from '@polkadot/types/lookup';
import { ISubmittableResult } from '@polkadot/types/types';
import { Bytes } from '@polkadot/types-codec';
import { ErrorCode } from '@polymeshassociation/polymesh-sdk/types';
import * as utilsPublicInternalModule from '@polymeshassociation/polymesh-sdk/utils/internal';
import { when } from 'jest-when';

import {
  createConfidentialAssetResolver,
  prepareCreateConfidentialAsset,
} from '~/api/procedures/createConfidentialAsset';
import { ConfidentialAsset, Context, Identity, PolymeshError } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import { ConfidentialAccount, CreateConfidentialAssetParams } from '~/types';
import * as utilsConversionModule from '~/utils/conversion';

describe('createConfidentialAsset procedure', () => {
  let mockContext: Mocked<Context>;

  let data: string;
  let rawData: Bytes;
  let auditors: ConfidentialAccount[];
  let mediators: Identity[];
  let rawAuditors: PalletConfidentialAssetConfidentialAuditors;
  let stringToBytesSpy: jest.SpyInstance;
  let auditorsToConfidentialAuditorsSpy: jest.SpyInstance;

  beforeAll(() => {
    dsMockUtils.initMocks();
    procedureMockUtils.initMocks();
    entityMockUtils.initMocks();

    stringToBytesSpy = jest.spyOn(utilsConversionModule, 'stringToBytes');
    auditorsToConfidentialAuditorsSpy = jest.spyOn(
      utilsConversionModule,
      'auditorsToConfidentialAuditors'
    );
  });

  beforeEach(() => {
    mockContext = dsMockUtils.getContextInstance();
    auditors = [entityMockUtils.getConfidentialAccountInstance()];
    mediators = [
      entityMockUtils.getIdentityInstance({
        did: 'someMediatorDid',
      }),
    ];

    rawAuditors = dsMockUtils.createMockConfidentialAuditors({
      auditors: ['somePublicKey'],
      mediators: ['someMediatorDid'],
    });

    data = 'SOME_DATA';
    rawData = dsMockUtils.createMockBytes(data);

    when(stringToBytesSpy).calledWith(data, mockContext).mockReturnValue(rawData);
    when(auditorsToConfidentialAuditorsSpy)
      .calledWith(mockContext, auditors, mediators)
      .mockReturnValue(rawAuditors);
  });

  afterEach(() => {
    entityMockUtils.reset();
    procedureMockUtils.reset();
    dsMockUtils.reset();
  });

  afterAll(() => {
    jest.resetAllMocks();
    procedureMockUtils.cleanup();
    dsMockUtils.cleanup();
  });

  it('should throw an error if a mediator does not exist', () => {
    const proc = procedureMockUtils.getInstance<CreateConfidentialAssetParams, ConfidentialAsset>(
      mockContext
    );

    const expectedError = new PolymeshError({
      code: ErrorCode.DataUnavailable,
      message: 'The identity does not exists',
    });

    return expect(
      prepareCreateConfidentialAsset.call(proc, {
        data,
        auditors,
        mediators: [entityMockUtils.getIdentityInstance({ exists: false })],
      })
    ).rejects.toThrow(expectedError);
  });

  it('should add a create CreateConfidentialAsset transaction to the queue', async () => {
    const proc = procedureMockUtils.getInstance<CreateConfidentialAssetParams, ConfidentialAsset>(
      mockContext
    );

    const createConfidentialAssetTransaction = dsMockUtils.createTxMock(
      'confidentialAsset',
      'createAsset'
    );

    let result = await prepareCreateConfidentialAsset.call(proc, {
      data,
      auditors,
      mediators,
    });

    expect(result).toEqual({
      transaction: createConfidentialAssetTransaction,
      resolver: expect.any(Function),
      args: [rawData, rawAuditors],
    });

    when(auditorsToConfidentialAuditorsSpy)
      .calledWith(mockContext, auditors, undefined)
      .mockReturnValue(rawAuditors);

    result = await prepareCreateConfidentialAsset.call(proc, {
      data,
      auditors,
      mediators: [],
    });

    expect(result).toEqual({
      transaction: createConfidentialAssetTransaction,
      resolver: expect.any(Function),
      args: [rawData, rawAuditors],
    });

    result = await prepareCreateConfidentialAsset.call(proc, {
      data,
      auditors,
    });

    expect(result).toEqual({
      transaction: createConfidentialAssetTransaction,
      resolver: expect.any(Function),
      args: [rawData, rawAuditors],
    });
  });

  describe('createConfidentialAssetResolver', () => {
    const filterEventRecordsSpy = jest.spyOn(utilsPublicInternalModule, 'filterEventRecords');
    const did = 'someDid';
    const rawIdentityId = dsMockUtils.createMockIdentityId(did);
    const rawConfidentialAsset = '0x76702175d8cbe3a55a19734433351e25';

    beforeEach(() => {
      filterEventRecordsSpy.mockReturnValue([
        dsMockUtils.createMockIEvent([rawIdentityId, rawConfidentialAsset]),
      ]);
    });

    afterEach(() => {
      jest.resetAllMocks();
      filterEventRecordsSpy.mockReset();
    });

    it('should return the new ConfidentialAsset', () => {
      const fakeContext = {} as Context;

      const result = createConfidentialAssetResolver(fakeContext)({} as ISubmittableResult);

      expect(result.id).toEqual('76702175-d8cb-e3a5-5a19-734433351e25');
    });
  });
});
