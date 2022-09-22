import { Bytes } from '@polkadot/types';
import { ISubmittableResult } from '@polkadot/types/types';
import BigNumber from 'bignumber.js';
import { when } from 'jest-when';
import { VenueType as MeshVenueType } from 'polymesh-types/types';

import { createCreateVenueResolver, prepareCreateVenue } from '~/api/procedures/createVenue';
import { Context, Venue } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { Mocked } from '~/testUtils/types';
import { CreateVenueParams, VenueType } from '~/types';
import { PolymeshTx } from '~/types/internal';
import * as utilsConversionModule from '~/utils/conversion';
import * as utilsInternalModule from '~/utils/internal';

describe('createVenue procedure', () => {
  let mockContext: Mocked<Context>;
  let stringToBytes: jest.SpyInstance<Bytes, [string, Context]>;
  let venueTypeToMeshVenueTypeStub: jest.SpyInstance<MeshVenueType, [VenueType, Context]>;
  let createVenueTransaction: PolymeshTx<unknown[]>;

  beforeAll(() => {
    entityMockUtils.initMocks();
    procedureMockUtils.initMocks();
    dsMockUtils.initMocks();
    stringToBytes = jest.spyOn(utilsConversionModule, 'stringToBytes');
    venueTypeToMeshVenueTypeStub = jest.spyOn(utilsConversionModule, 'venueTypeToMeshVenueType');
  });

  beforeEach(() => {
    mockContext = dsMockUtils.getContextInstance();
    createVenueTransaction = dsMockUtils.createTxStub('settlement', 'createVenue');
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

  it('should return a createVenue transaction spec', async () => {
    const description = 'description';
    const type = VenueType.Distribution;
    const args = {
      description,
      type,
    };
    const rawDetails = dsMockUtils.createMockBytes(description);
    const rawType = dsMockUtils.createMockVenueType(type);

    const proc = procedureMockUtils.getInstance<CreateVenueParams, Venue>(mockContext);

    when(stringToBytes).calledWith(description, mockContext).mockReturnValue(rawDetails);
    when(venueTypeToMeshVenueTypeStub).calledWith(type, mockContext).mockReturnValue(rawType);

    const result = await prepareCreateVenue.call(proc, args);

    expect(result).toEqual({
      transaction: createVenueTransaction,
      args: [rawDetails, [], rawType],
      resolver: expect.any(Function),
    });
  });
});

describe('createCreateVenueResolver', () => {
  const filterEventRecordsStub = jest.spyOn(utilsInternalModule, 'filterEventRecords');
  const id = new BigNumber(10);
  const rawId = dsMockUtils.createMockU64(id);

  beforeAll(() => {
    entityMockUtils.initMocks({
      venueOptions: {
        id,
      },
    });
  });

  beforeEach(() => {
    filterEventRecordsStub.mockReturnValue([dsMockUtils.createMockIEvent(['did', rawId])]);
  });

  afterEach(() => {
    filterEventRecordsStub.mockReset();
  });

  it('should return the new Venue', () => {
    const fakeContext = {} as Context;

    const result = createCreateVenueResolver(fakeContext)({} as ISubmittableResult);

    expect(result.id).toEqual(id);
  });
});
