import * as polkadotModule from '@polymathnetwork/polkadot/api';
import { BigNumber } from 'bignumber.js';
import sinon from 'sinon';
import { ImportMock, MockManager } from 'ts-mock-imports';

import { TickerReservation } from '~/api/entities';
import { reserveTicker } from '~/api/procedures';
import { TransactionQueue } from '~/base';
import { Polymesh } from '~/Polymesh';
import { PolkadotMockFactory } from '~/testUtils/mocks';

describe('Polymesh Class', () => {
  const polkadotMockFactory = new PolkadotMockFactory();
  polkadotMockFactory.initMocks({ mockContext: true });
  let mockWsProvider: MockManager<polkadotModule.WsProvider>;

  beforeEach(() => {
    mockWsProvider = ImportMock.mockClass<polkadotModule.WsProvider>(polkadotModule, 'WsProvider');
  });

  afterEach(() => {
    polkadotMockFactory.reset();
    mockWsProvider.restore();
  });

  afterAll(() => {
    polkadotMockFactory.cleanup();
  });

  describe('method: create', () => {
    test('should instantiate Context and return a Polymesh instance', async () => {
      const polymesh = await Polymesh.connect({
        nodeUrl: 'wss://some.url',
      });

      sinon.assert.match(polymesh instanceof Polymesh, true);
    });

    test('should instantiate Context with a seed and return a Polymesh instance', async () => {
      const accountSeed = 'Alice'.padEnd(32, ' ');
      const createStub = polkadotMockFactory.getContextCreateStub();

      await Polymesh.connect({
        nodeUrl: 'wss://some.url',
        accountSeed,
      });

      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, {
        polymeshApi: polkadotMockFactory.getApiInstance(),
        seed: accountSeed,
      });
    });

    test('should instantiate Context with a keyring and return a Polymesh instance', async () => {
      const keyring = {} as polkadotModule.Keyring;
      const createStub = polkadotMockFactory.getContextCreateStub();

      await Polymesh.connect({
        nodeUrl: 'wss://some.url',
        keyring,
      });

      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, {
        polymeshApi: polkadotMockFactory.getApiInstance(),
        keyring,
      });
    });

    test('should instantiate Context with a uri and return a Polymesh instance', async () => {
      const accountUri = '//uri';
      const createStub = polkadotMockFactory.getContextCreateStub();

      await Polymesh.connect({
        nodeUrl: 'wss://some.url',
        accountUri,
      });

      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, {
        polymeshApi: polkadotMockFactory.getApiInstance(),
        uri: accountUri,
      });
    });

    test('should throw if Context fails in the connection process', async () => {
      polkadotMockFactory.throwOnApiCreation();
      const nodeUrl = 'wss://some.url';
      const polymeshApiPromise = Polymesh.connect({
        nodeUrl,
      });

      return expect(polymeshApiPromise).rejects.toThrow(
        `Error while connecting to "${nodeUrl}": "Error"`
      );
    });

    test('should throw if Context create method fails', () => {
      polkadotMockFactory.throwOnContextCreation();
      const nodeUrl = 'wss://some.url';
      const polymeshApiPromise = Polymesh.connect({
        nodeUrl,
      });

      return expect(polymeshApiPromise).rejects.toThrow(
        `Error while connecting to "${nodeUrl}": "Error"`
      );
    });
  });

  describe('method: getIdentityBalance', () => {
    test('should throw if identity was not instantiated', async () => {
      polkadotMockFactory.initMocks({ mockContext: { withSeed: false } });

      const polymesh = await Polymesh.connect({
        nodeUrl: 'wss://some.url',
      });

      return expect(polymesh.getIdentityBalance()).rejects.toThrow(
        'The current account does not have an associated identity'
      );
    });

    test("should return the identity's POLY balance", async () => {
      const fakeBalance = new BigNumber(20);
      polkadotMockFactory.initMocks({ mockContext: { withSeed: true, balance: fakeBalance } });

      const polymesh = await Polymesh.connect({
        nodeUrl: 'wss://some.url',
        accountSeed: 'seed',
      });

      const result = await polymesh.getIdentityBalance();
      expect(result).toEqual(fakeBalance);
    });
  });

  describe('method: getAccountBalance', () => {
    test('should return the free POLY balance', async () => {
      const fakeBalance = new BigNumber(100);
      polkadotMockFactory.initMocks({ mockContext: { balance: fakeBalance } });

      const polymesh = await Polymesh.connect({
        nodeUrl: 'wss://some.url',
      });

      const result = await polymesh.getAccountBalance();
      expect(result).toEqual(fakeBalance);
    });
  });

  describe('method: reserveTicker', () => {
    test('should prepare the procedure with the correct arguments and context, and return the resulting transaction queue', async () => {
      const context = polkadotMockFactory.getContextInstance();

      const polymesh = await Polymesh.connect({
        nodeUrl: 'wss://some.url',
      });

      const args = {
        ticker: 'someTicker',
      };

      const expectedQueue = ('someQueue' as unknown) as TransactionQueue<TickerReservation>;

      sinon
        .stub(reserveTicker, 'prepare')
        .withArgs(args, context)
        .resolves(expectedQueue);

      const queue = await polymesh.reserveTicker(args);

      expect(queue).toBe(expectedQueue);
    });
  });
});
