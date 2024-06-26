import { bool } from '@polkadot/types';
import { ErrorCode } from '@polymeshassociation/polymesh-sdk/types';
import * as utilsPublicConversionModule from '@polymeshassociation/polymesh-sdk/utils/conversion';
import BigNumber from 'bignumber.js';
import { when } from 'jest-when';

import { ConfidentialAsset, Context, Entity, PolymeshError, PolymeshTransaction } from '~/internal';
import {
  confidentialAssetQuery,
  transactionHistoryByConfidentialAssetQuery,
} from '~/middleware/queries';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import { ConfidentialAccount, ConfidentialAssetTransactionHistory } from '~/types';
import { tuple } from '~/types/utils';
import * as utilsConversionModule from '~/utils/conversion';

jest.mock(
  '~/base/ConfidentialProcedure',
  require('~/testUtils/mocks/procedure').mockConfidentialProcedureModule(
    '~/base/ConfidentialProcedure'
  )
);

jest.mock(
  '~/api/entities/ConfidentialAccount',
  require('~/testUtils/mocks/entities').mockConfidentialAccountModule(
    '~/api/entities/ConfidentialAccount'
  )
);

describe('ConfidentialAsset class', () => {
  let assetId: string;
  let id: string;
  let confidentialAsset: ConfidentialAsset;
  let mockConfidentialAccount: ConfidentialAccount;
  let context: Context;
  const assetDetails = {
    totalSupply: new BigNumber(100),
    data: 'SOME_DATA',
    ownerDid: 'SOME_DID',
  };
  let detailsQueryMock: jest.Mock;
  let assetFrozenMock: jest.Mock;
  let accountAssetFrozenMock: jest.Mock;

  beforeAll(() => {
    dsMockUtils.initMocks();
    entityMockUtils.initMocks();
    procedureMockUtils.initMocks();
  });

  beforeEach(() => {
    assetId = '76702175d8cbe3a55a19734433351e25';
    id = '76702175-d8cb-e3a5-5a19-734433351e25';
    context = dsMockUtils.getContextInstance();
    confidentialAsset = new ConfidentialAsset({ id: assetId }, context);
    mockConfidentialAccount = entityMockUtils.getConfidentialAccountInstance();
    detailsQueryMock = dsMockUtils.createQueryMock('confidentialAsset', 'details');
    assetFrozenMock = dsMockUtils.createQueryMock('confidentialAsset', 'assetFrozen');
    accountAssetFrozenMock = dsMockUtils.createQueryMock('confidentialAsset', 'accountAssetFrozen');

    detailsQueryMock.mockResolvedValue(
      dsMockUtils.createMockOption(
        dsMockUtils.createMockConfidentialAssetDetails({
          ...assetDetails,
          ticker: dsMockUtils.createMockOption(),
        })
      )
    );

    assetFrozenMock.mockResolvedValue(dsMockUtils.createMockBool(false));
    accountAssetFrozenMock.mockResolvedValue(dsMockUtils.createMockBool(false));
  });

  afterEach(() => {
    dsMockUtils.reset();
    entityMockUtils.reset();
  });

  afterAll(() => {
    dsMockUtils.cleanup();
  });

  it('should extend Entity', () => {
    expect(ConfidentialAsset.prototype instanceof Entity).toBe(true);
  });

  describe('constructor', () => {
    it('should assign ID to instance', () => {
      expect(confidentialAsset.id).toBe(id);
    });
  });

  describe('method: isUniqueIdentifiers', () => {
    it('should return true if the object conforms to the interface', () => {
      expect(
        ConfidentialAsset.isUniqueIdentifiers({ id: '76702175d8cbe3a55a19734433351e25' })
      ).toBe(true);
      expect(ConfidentialAsset.isUniqueIdentifiers({})).toBe(false);
      expect(ConfidentialAsset.isUniqueIdentifiers({ id: 3 })).toBe(false);
    });
  });

  describe('method: issue', () => {
    it('should prepare the procedure with the correct arguments and context, and return the resulting transaction', async () => {
      const args = {
        amount: new BigNumber(100),
        confidentialAccount: 'someAccount',
      };

      const expectedTransaction =
        'someTransaction' as unknown as PolymeshTransaction<ConfidentialAsset>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { confidentialAsset, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.issue(args);

      expect(tx).toBe(expectedTransaction);
    });
  });

  describe('method: burn', () => {
    it('should prepare the procedure with the correct arguments and context, and return the resulting transaction', async () => {
      const args = {
        amount: new BigNumber(100),
        confidentialAccount: 'someAccount',
        proof: 'someBurnProof',
      };

      const expectedTransaction =
        'someTransaction' as unknown as PolymeshTransaction<ConfidentialAsset>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { confidentialAsset, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.burn(args);

      expect(tx).toBe(expectedTransaction);
    });
  });

  describe('method: setVenueFiltering', () => {
    it('should prepare the procedure with the correct arguments and context, and return the resulting transaction', async () => {
      const enabled = true;

      const args = {
        enabled,
      };

      const expectedTransaction = 'someTransaction' as unknown as PolymeshTransaction<void>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { assetId, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.setVenueFiltering(args);

      expect(tx).toBe(expectedTransaction);
    });

    it('should prepare the procedure and return the resulting transaction for allowingVenues', async () => {
      const args = {
        allowedVenues: [new BigNumber(1), new BigNumber(2)],
      };

      const expectedTransaction = 'someTransaction' as unknown as PolymeshTransaction<void>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { assetId, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.setVenueFiltering(args);

      expect(tx).toBe(expectedTransaction);
    });

    it('should prepare the procedure and return the resulting transaction for disallowingVenues', async () => {
      const args = {
        disallowedVenues: [new BigNumber(1), new BigNumber(2)],
      };

      const expectedTransaction = 'someTransaction' as unknown as PolymeshTransaction<void>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { assetId, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.setVenueFiltering(args);

      expect(tx).toBe(expectedTransaction);
    });
  });

  describe('method: details', () => {
    let u128ToBigNumberSpy: jest.SpyInstance;
    let bytesToStringSpy: jest.SpyInstance;
    let identityIdToStringSpy: jest.SpyInstance;

    beforeAll(() => {
      u128ToBigNumberSpy = jest.spyOn(utilsPublicConversionModule, 'u128ToBigNumber');
      bytesToStringSpy = jest.spyOn(utilsPublicConversionModule, 'bytesToString');
      identityIdToStringSpy = jest.spyOn(utilsPublicConversionModule, 'identityIdToString');
    });

    beforeEach(() => {
      when(bytesToStringSpy).calledWith(assetDetails.data).mockReturnValue(assetDetails.data);
      when(u128ToBigNumberSpy)
        .calledWith(assetDetails.totalSupply)
        .mockReturnValue(assetDetails.totalSupply);
      when(identityIdToStringSpy)
        .calledWith(assetDetails.ownerDid)
        .mockReturnValue(assetDetails.ownerDid);
    });

    it('should return the basic details of the confidential Asset', async () => {
      const expectedAssetDetails = {
        data: assetDetails.data,
        owner: expect.objectContaining({
          did: assetDetails.ownerDid,
        }),
        totalSupply: assetDetails.totalSupply,
      };

      const result = await confidentialAsset.details();

      expect(result).toEqual(expect.objectContaining(expectedAssetDetails));
    });

    it('should throw an error if confidential Asset details are not available', async () => {
      const expectedError = new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'The Confidential Asset does not exists',
        data: { id },
      });
      detailsQueryMock.mockResolvedValue(dsMockUtils.createMockOption());
      await expect(confidentialAsset.details()).rejects.toThrow(expectedError);
    });
  });

  describe('method: getAuditors', () => {
    it('should throw an error if no auditor info exists', () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'assetAuditors', {
        returnValue: dsMockUtils.createMockOption(),
      });

      const expectedError = new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'The Confidential Asset does not exists',
        data: { id },
      });

      return expect(confidentialAsset.getAuditors()).rejects.toThrow(expectedError);
    });

    it('should return all the auditors group by their type', async () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'assetAuditors', {
        returnValue: dsMockUtils.createMockOption(
          dsMockUtils.createMockConfidentialAuditors({
            auditors: ['someAuditorPublicKey'],
            mediators: ['someMediatorDid'],
          })
        ),
      });

      const result = await confidentialAsset.getAuditors();

      expect(result.mediators[0]).toEqual(
        expect.objectContaining({
          did: 'someMediatorDid',
        })
      );

      expect(result.auditors[0]).toEqual(
        expect.objectContaining({
          publicKey: 'someAuditorPublicKey',
        })
      );
    });
  });

  describe('method: getVenueFilteringDetails', () => {
    let boolToBooleanSpy: jest.SpyInstance;
    let rawTrue: bool;
    let rawFalse: bool;

    beforeAll(() => {
      boolToBooleanSpy = jest.spyOn(utilsPublicConversionModule, 'boolToBoolean');
    });

    beforeEach(() => {
      rawTrue = dsMockUtils.createMockBool(true);
      rawFalse = dsMockUtils.createMockBool(false);
      when(boolToBooleanSpy).calledWith(rawTrue).mockReturnValue(true);
      when(boolToBooleanSpy).calledWith(rawFalse).mockReturnValue(false);
    });

    it('should return enabled as false when venue filtering is disabled', async () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'venueFiltering', {
        returnValue: rawFalse,
      });
      dsMockUtils.createQueryMock('confidentialAsset', 'venueAllowList', {
        entries: [],
      });
      const result = await confidentialAsset.getVenueFilteringDetails();

      expect(result).toEqual({
        enabled: false,
      });
    });

    it('should return enabled as true along with allowed venues if venue filtering is enabled', async () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'venueFiltering', {
        returnValue: rawTrue,
      });
      dsMockUtils.createQueryMock('confidentialAsset', 'venueAllowList', {
        entries: [tuple([`0x${assetId}`, dsMockUtils.createMockU64(new BigNumber(1))], rawTrue)],
      });
      const result = await confidentialAsset.getVenueFilteringDetails();

      expect(result).toEqual({
        enabled: true,
        allowedConfidentialVenues: [expect.objectContaining({ id: new BigNumber(1) })],
      });
    });
  });

  describe('method: isFrozen', () => {
    it('should return false if Confidential Asset is not frozen', async () => {
      const result = await confidentialAsset.isFrozen();

      expect(result).toEqual(false);
    });
  });

  describe('method: isAccountFrozen', () => {
    it('should return false if Confidential Account is not frozen for the asset', async () => {
      const result = await confidentialAsset.isAccountFrozen(mockConfidentialAccount);

      expect(result).toEqual(false);
    });
  });

  describe('method: freeze', () => {
    it('should prepare the procedure with the correct arguments and context, and return the resulting transaction', async () => {
      const freeze = true;

      const args = {
        freeze,
      };

      const expectedTransaction = 'someTransaction' as unknown as PolymeshTransaction<void>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { confidentialAsset, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.freeze();

      expect(tx).toBe(expectedTransaction);
    });
  });

  describe('method: unfreeze', () => {
    it('should prepare the procedure with the correct arguments and context, and return the resulting transaction', async () => {
      const freeze = false;

      const args = {
        freeze,
      };

      const expectedTransaction = 'someTransaction' as unknown as PolymeshTransaction<void>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { confidentialAsset, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.unfreeze();

      expect(tx).toBe(expectedTransaction);
    });
  });

  describe('method: freezeAccount', () => {
    it('should prepare the procedure with the correct arguments and context, and return the resulting transaction', async () => {
      const freeze = true;

      const args = {
        freeze,
        confidentialAccount: mockConfidentialAccount,
      };

      const expectedTransaction = 'someTransaction' as unknown as PolymeshTransaction<void>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { confidentialAsset, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.freezeAccount({
        confidentialAccount: mockConfidentialAccount,
      });

      expect(tx).toBe(expectedTransaction);
    });
  });

  describe('method: unfreezeAccount', () => {
    it('should prepare the procedure with the correct arguments and context, and return the resulting transaction', async () => {
      const freeze = false;

      const args = {
        freeze,
        confidentialAccount: mockConfidentialAccount,
      };

      const expectedTransaction = 'someTransaction' as unknown as PolymeshTransaction<void>;

      when(procedureMockUtils.getPrepareMock())
        .calledWith({ args: { confidentialAsset, ...args }, transformer: undefined }, context, {})
        .mockResolvedValue(expectedTransaction);

      const tx = await confidentialAsset.unfreezeAccount({
        confidentialAccount: mockConfidentialAccount,
      });

      expect(tx).toBe(expectedTransaction);
    });
  });

  describe('method: exists', () => {
    it('should return if Confidential Asset exists', async () => {
      let result = await confidentialAsset.exists();

      expect(result).toBeTruthy();

      detailsQueryMock.mockResolvedValue(dsMockUtils.createMockOption());

      result = await confidentialAsset.exists();

      expect(result).toBeFalsy();
    });
  });

  describe('method: toHuman', () => {
    it('should return a human readable version of the entity', () => {
      expect(confidentialAsset.toHuman()).toBe(id);
    });
  });

  describe('method: getTransactionHistory', () => {
    it('should return the paginated list of transaction history for the entity', async () => {
      const middlewareAssetHistoryToTransactionHistorySpy = jest.spyOn(
        utilsConversionModule,
        'middlewareAssetHistoryToTransactionHistory'
      );

      const confidentialAssetHistoriesResponse = {
        totalCount: 5,
        nodes: ['instructions'],
      };

      dsMockUtils.createApolloQueryMock(
        transactionHistoryByConfidentialAssetQuery(
          {
            assetId: `0x${assetId}`,
          },
          new BigNumber(2),
          new BigNumber(0)
        ),
        {
          confidentialAssetHistories: confidentialAssetHistoriesResponse,
        }
      );

      const mockTransactionHistory = 'mockData' as unknown as ConfidentialAssetTransactionHistory;

      middlewareAssetHistoryToTransactionHistorySpy.mockReturnValue(mockTransactionHistory);

      let result = await confidentialAsset.getTransactionHistory({
        size: new BigNumber(2),
        start: new BigNumber(0),
      });

      const { data, next, count } = result;

      expect(next).toEqual(new BigNumber(1));
      expect(count).toEqual(new BigNumber(5));
      expect(data).toEqual([mockTransactionHistory]);

      dsMockUtils.createApolloQueryMock(
        transactionHistoryByConfidentialAssetQuery({
          assetId: `0x${assetId}`,
        }),
        {
          confidentialAssetHistories: confidentialAssetHistoriesResponse,
        }
      );

      result = await confidentialAsset.getTransactionHistory();

      expect(result.count).toEqual(new BigNumber(5));
      expect(result.next).toEqual(new BigNumber(result.data.length));
    });
  });

  describe('method: createdAt', () => {
    it('should return the event identifier object of the ConfidentialAsset creation', async () => {
      const blockNumber = new BigNumber(1234);
      const blockDate = new Date('4/14/2020');
      const blockHash = 'someHash';
      const eventIdx = new BigNumber(1);
      const variables = {
        id: `0x${assetId}`,
      };
      const fakeResult = { blockNumber, blockHash, blockDate, eventIndex: eventIdx };

      dsMockUtils.createApolloQueryMock(confidentialAssetQuery(variables), {
        confidentialAssets: {
          nodes: [
            {
              createdBlock: {
                blockId: blockNumber.toNumber(),
                datetime: blockDate,
                hash: blockHash,
              },
              eventIdx: eventIdx.toNumber(),
            },
          ],
        },
      });

      const result = await confidentialAsset.createdAt();

      expect(result).toEqual(fakeResult);
    });

    it('should return null if the query result is empty', async () => {
      const variables = {
        id: `0x${assetId}`,
      };

      dsMockUtils.createApolloQueryMock(confidentialAssetQuery(variables), {
        confidentialAssets: {
          nodes: [],
        },
      });
      const result = await confidentialAsset.createdAt();
      expect(result).toBeNull();
    });
  });
});
