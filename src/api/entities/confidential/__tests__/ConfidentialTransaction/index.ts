import { u64 } from '@polkadot/types';
import BigNumber from 'bignumber.js';
import { when } from 'jest-when';

import { ConfidentialTransaction, Context, Entity, PolymeshError } from '~/internal';
import { dsMockUtils, entityMockUtils, procedureMockUtils } from '~/testUtils/mocks';
import {
  createMockConfidentialAssetTransaction,
  createMockConfidentialTransactionStatus,
  createMockOption,
} from '~/testUtils/mocks/dataSources';
import { Mocked } from '~/testUtils/types';
import { ConfidentialTransactionStatus, ErrorCode, UnsubCallback } from '~/types';
import { tuple } from '~/types/utils';
import * as utilsConversionModule from '~/utils/conversion';

jest.mock(
  '~/api/entities/confidential/ConfidentialAsset',
  require('~/testUtils/mocks/entities').mockConfidentialAssetModule(
    '~/api/entities/confidential/ConfidentialAsset'
  )
);

describe('ConfidentialTransaction class', () => {
  let context: Mocked<Context>;
  let transaction: ConfidentialTransaction;
  let id: BigNumber;

  beforeAll(() => {
    dsMockUtils.initMocks();
    entityMockUtils.initMocks();
    procedureMockUtils.initMocks();

    id = new BigNumber(1);
  });

  beforeEach(() => {
    context = dsMockUtils.getContextInstance();
    transaction = new ConfidentialTransaction({ id }, context);
  });

  afterEach(() => {
    dsMockUtils.reset();
    entityMockUtils.reset();
    procedureMockUtils.reset();
  });

  afterAll(() => {
    dsMockUtils.cleanup();
    procedureMockUtils.cleanup();
  });

  it('should extend Entity', () => {
    expect(ConfidentialTransaction.prototype instanceof Entity).toBe(true);
  });

  describe('method: isUniqueIdentifiers', () => {
    it('should return true if the object conforms to the interface', () => {
      expect(ConfidentialTransaction.isUniqueIdentifiers({ id: new BigNumber(1) })).toBe(true);
      expect(ConfidentialTransaction.isUniqueIdentifiers({})).toBe(false);
      expect(ConfidentialTransaction.isUniqueIdentifiers({ id: 3 })).toBe(false);
    });
  });

  describe('method: exists', () => {
    it('should return whether the instruction exists', async () => {
      dsMockUtils
        .createQueryMock('confidentialAsset', 'transactionCounter')
        .mockResolvedValue(
          dsMockUtils.createMockCompact(dsMockUtils.createMockU64(new BigNumber(10)))
        );

      let result = await transaction.exists();

      expect(result).toBe(true);

      let fakeTransaction = new ConfidentialTransaction({ id: new BigNumber(0) }, context);

      result = await fakeTransaction.exists();

      expect(result).toBe(false);

      fakeTransaction = new ConfidentialTransaction({ id: new BigNumber(20) }, context);

      result = await fakeTransaction.exists();

      expect(result).toBe(false);
    });
  });

  describe('method: details', () => {
    const mockCreatedAt = dsMockUtils.createMockU32(new BigNumber(1));
    const mockVenueId = dsMockUtils.createMockU64(new BigNumber(2));
    const mockStatus = dsMockUtils.createMockConfidentialTransactionStatus(
      ConfidentialTransactionStatus.Pending
    );

    it('should return details', async () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'transactions').mockResolvedValue(
        dsMockUtils.createMockOption(
          createMockConfidentialAssetTransaction({
            venueId: mockVenueId,
            createdAt: mockCreatedAt,
            memo: createMockOption(),
          })
        )
      );

      dsMockUtils
        .createQueryMock('confidentialAsset', 'transactionStatuses')
        .mockResolvedValue(dsMockUtils.createMockOption(mockStatus));

      const result = await transaction.details();

      expect(result).toEqual({
        createdAt: new BigNumber(1),
        memo: undefined,
        status: ConfidentialTransactionStatus.Pending,
        venueId: new BigNumber(2),
      });
    });

    it('should throw an error if transaction details are not found', async () => {
      dsMockUtils
        .createQueryMock('confidentialAsset', 'transactions')
        .mockResolvedValue(dsMockUtils.createMockOption());

      dsMockUtils
        .createQueryMock('confidentialAsset', 'transactionStatuses')
        .mockResolvedValue(dsMockUtils.createMockOption(mockStatus));

      const expectedError = new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'Confidential transaction details were not found',
      });

      return expect(transaction.details()).rejects.toThrow(expectedError);
    });

    it('should throw an error if transaction status is not found', async () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'transactions').mockResolvedValue(
        dsMockUtils.createMockOption(
          createMockConfidentialAssetTransaction({
            venueId: mockVenueId,
            createdAt: mockCreatedAt,
            memo: createMockOption(),
          })
        )
      );

      dsMockUtils
        .createQueryMock('confidentialAsset', 'transactionStatuses')
        .mockResolvedValue(dsMockUtils.createMockOption());

      const expectedError = new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'Confidential transaction details were not found',
      });

      return expect(transaction.details()).rejects.toThrow(expectedError);
    });
  });

  describe('method: onStatusChange', () => {
    let bigNumberToU64Spy: jest.SpyInstance;
    let transactionStatusesMock: jest.Mock;
    let rawId: u64;

    afterAll(() => {
      jest.restoreAllMocks();
    });

    beforeAll(() => {
      bigNumberToU64Spy = jest.spyOn(utilsConversionModule, 'bigNumberToU64');
    });

    beforeEach(() => {
      const owner = 'someDid';
      rawId = dsMockUtils.createMockU64(new BigNumber(1));
      entityMockUtils.configureMocks({ identityOptions: { did: owner } });
      when(bigNumberToU64Spy).calledWith(id, context).mockReturnValue(rawId);

      transactionStatusesMock = dsMockUtils.createQueryMock(
        'confidentialAsset',
        'transactionStatuses'
      );
    });

    it('should allow subscription', async () => {
      const unsubCallback = 'unsubCallback' as unknown as Promise<UnsubCallback>;
      const callback = jest.fn();

      const mockPendingStatus = dsMockUtils.createMockConfidentialTransactionStatus(
        ConfidentialTransactionStatus.Pending
      );
      const mockPending = dsMockUtils.createMockOption(
        createMockConfidentialTransactionStatus(ConfidentialTransactionStatus.Pending)
      );
      transactionStatusesMock.mockImplementationOnce(async (_, cbFunc) => {
        cbFunc(mockPending);
        return unsubCallback;
      });

      when(transactionStatusesMock).calledWith(rawId).mockResolvedValue(mockPendingStatus);

      let result = await transaction.onStatusChange(callback);

      expect(result).toEqual(unsubCallback);
      expect(callback).toBeCalledWith(ConfidentialTransactionStatus.Pending);

      const mockRejectedStatus = dsMockUtils.createMockOption(
        dsMockUtils.createMockInstructionStatus(ConfidentialTransactionStatus.Rejected)
      );

      transactionStatusesMock.mockImplementationOnce(async (_, cbFunc) => {
        cbFunc(mockRejectedStatus);
        return unsubCallback;
      });

      result = await transaction.onStatusChange(callback);

      expect(result).toEqual(unsubCallback);
      expect(callback).toBeCalledWith(ConfidentialTransactionStatus.Rejected);
    });

    it('should error missing transaction status', () => {
      const unsubCallback = 'unsubCallback' as unknown as Promise<UnsubCallback>;
      const callback = jest.fn();

      transactionStatusesMock.mockImplementationOnce(async (_, cbFunc) => {
        cbFunc(dsMockUtils.createMockOption());
        return unsubCallback;
      });

      const expectedError = new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'The status of the transaction was not found',
      });

      return expect(transaction.onStatusChange(callback)).rejects.toThrow(expectedError);
    });
  });

  describe('method: getInvolvedParties', () => {
    it('should get involved parties for the transaction', async () => {
      const rawId = dsMockUtils.createMockU64(transaction.id);
      dsMockUtils.createQueryMock('confidentialAsset', 'transactionParties', {
        entries: [
          tuple(
            [rawId, dsMockUtils.createMockIdentityId('0x01')],
            dsMockUtils.createMockBool(true)
          ),
          tuple(
            [rawId, dsMockUtils.createMockIdentityId('0x02')],
            dsMockUtils.createMockBool(true)
          ),
        ],
      });

      const result = await transaction.getInvolvedParties();

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ did: '0x01' }),
          expect.objectContaining({ did: '0x02' }),
        ])
      );
    });

    it('should throw an error if no parties are found', () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'transactionParties', {
        entries: [],
      });

      const expectedError = new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message:
          'No involved parties were found for this transaction. Its likely been completed and the chain storage has been pruned',
      });

      return expect(transaction.getInvolvedParties()).rejects.toThrow(expectedError);
    });
  });

  describe('method: getLegs', () => {
    const legId = new BigNumber(2);
    const rawTransactionId = dsMockUtils.createMockConfidentialAssetTransactionId(id);
    const senderKey = '0x01';
    const receiverKey = '0x02';
    const mediatorDid = 'someDid';
    const sender = dsMockUtils.createMockConfidentialAccount(senderKey);
    const receiver = dsMockUtils.createMockConfidentialAccount(receiverKey);
    const mediator = dsMockUtils.createMockIdentityId(mediatorDid);

    beforeEach(() => {});

    it('should return the transaction legs', async () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'transactionLegs', {
        entries: [
          tuple(
            [rawTransactionId, dsMockUtils.createMockConfidentialTransactionLegId(legId)],
            dsMockUtils.createMockOption(
              dsMockUtils.createMockConfidentialLegDetails({
                sender,
                receiver,
                auditors: dsMockUtils.createMockBTreeMap(),
                mediators: [mediator],
              })
            )
          ),
        ],
      });

      const result = await transaction.getLegs();
      expect(result).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: new BigNumber(2) })])
      );
    });

    it('should throw an error if details are None', () => {
      dsMockUtils.createQueryMock('confidentialAsset', 'transactionLegs', {
        entries: [
          tuple(
            [
              dsMockUtils.createMockConfidentialAssetTransactionId(id),
              dsMockUtils.createMockConfidentialTransactionLegId(legId),
            ],
            dsMockUtils.createMockOption()
          ),
        ],
      });

      const expectedError = new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'There were no details for a confidential transaction leg',
      });

      return expect(transaction.getLegs()).rejects.toThrow(expectedError);
    });
  });

  describe('method: toHuman', () => {
    it('should return a human readable version of the entity', () => {
      expect(transaction.toHuman()).toBe('1');
    });
  });
});
