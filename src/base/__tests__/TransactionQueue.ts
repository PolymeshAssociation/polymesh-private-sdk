import { ISubmittableResult } from '@polkadot/types/types';
import BigNumber from 'bignumber.js';
import { noop } from 'lodash';
import sinon from 'sinon';

import { PostTransactionValue } from '~/base';
import { Context } from '~/context';
import { dsMockUtils, polymeshTransactionMockUtils } from '~/testUtils/mocks';
import { TransactionQueueStatus, TransactionStatus } from '~/types';
import { TransactionSpec } from '~/types/internal';
import * as utilsModule from '~/utils';

import { TransactionQueue } from '../TransactionQueue';

const { delay } = utilsModule;

jest.mock(
  '~/base/PolymeshTransaction',
  require('~/testUtils/mocks/polymeshTransaction').mockPolymeshTransactionModule(
    '~/base/PolymeshTransaction'
  )
);

describe('Transaction Queue class', () => {
  let context: Context;

  beforeAll(() => {
    polymeshTransactionMockUtils.initMocks();
    dsMockUtils.initMocks();
  });

  beforeEach(() => {
    context = dsMockUtils.getContextInstance();
  });

  afterEach(() => {
    polymeshTransactionMockUtils.reset();
    dsMockUtils.reset();
  });

  afterAll(() => {
    dsMockUtils.cleanup();
  });

  describe('constructor', () => {
    test('should set the arguments, fees and list of transactions', () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
      ];
      const transactions = polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);
      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>],
        returnValue,
        context
      );
      expect(queue.transactions).toEqual(transactions);
    });
  });

  describe('method: run', () => {
    test("should run each transaction in the queue and return the queue's return value, unwrapping it if it is a PostTransactionValue", async () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
        {
          args: ['someArg'],
          isCritical: true,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
      ];

      const transactions = polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);

      const returnValue = 3;
      let queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>, TransactionSpec<[string]>],
        returnValue,
        context
      );

      let returned = await queue.run();

      expect(returned).toBe(returnValue);
      transactions.forEach(transaction => {
        sinon.assert.calledOnce(transaction.run);
      });

      polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);

      const returnPostTransactionValue = new PostTransactionValue(() =>
        Promise.resolve(returnValue)
      );
      await returnPostTransactionValue.run({} as ISubmittableResult);

      queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>, TransactionSpec<[string]>],
        returnPostTransactionValue,
        context
      );

      returned = await queue.run();

      expect(returned).toBe(returnValue);
    });

    test('should update the queue status', async () => {
      const transactionSpecs = [
        {
          args: [12],
          isCritical: true,
          autoresolve: false as false,
        },
      ];
      let transactions = polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);
      const returnValue = 3;
      let queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>],
        returnValue,
        context
      );

      // Idle -> Running -> Succeeded
      expect(queue.status).toBe(TransactionQueueStatus.Idle);

      queue.run();

      await delay(0);

      expect(queue.status).toBe(TransactionQueueStatus.Running);

      polymeshTransactionMockUtils.updateTransactionStatus(
        transactions[0],
        TransactionStatus.Succeeded
      );

      await delay(0);

      expect(queue.status).toBe(TransactionQueueStatus.Succeeded);

      transactions = polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);

      // Idle -> Running -> Failed
      queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>],
        returnValue,
        context
      );

      queue.run().catch(noop);

      await delay(0);

      polymeshTransactionMockUtils.updateTransactionStatus(
        transactions[0],
        TransactionStatus.Failed
      );
      await delay(0);

      expect(queue.status).toBe(TransactionQueueStatus.Failed);
    });

    test('should throw an error if a critical transaction fails', () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
        {
          args: ['someArg'],
          isCritical: true,
          autoresolve: TransactionStatus.Failed as TransactionStatus.Failed,
        },
      ];

      polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);

      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>, TransactionSpec<[string]>],
        returnValue,
        context
      );

      const runPromise = queue.run();

      return expect(runPromise).rejects.toThrow('Transaction Error');
    });

    test("should throw an error if the current account doesn't have enough balance to pay the transaction fees", () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          fees: {
            protocol: new BigNumber(200),
            gas: new BigNumber(200),
          },
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
        {
          args: ['someArg'],
          isCritical: true,
          autoresolve: TransactionStatus.Failed as TransactionStatus.Failed,
        },
      ];

      polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);
      dsMockUtils.setContextAccountBalance({
        free: new BigNumber(100),
        locked: new BigNumber(0),
      });

      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>, TransactionSpec<[string]>],
        returnValue,
        context
      );

      const runPromise = queue.run();

      return expect(runPromise).rejects.toThrow(
        "Not enough POLYX balance to pay for this procedure's fees"
      );
    });

    test('should succeed if the only failures are from non-critical transactions', () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: TransactionStatus.Failed as TransactionStatus.Failed,
        },
        {
          args: ['someArg'],
          isCritical: true,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
      ];

      polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);

      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>, TransactionSpec<[string]>],
        returnValue,
        context
      );

      const runPromise = queue.run();

      return expect(runPromise).resolves.not.toThrow();
    });

    test('should throw an error if attempting to run a queue that has already run', async () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
        {
          args: ['someArg'],
          isCritical: true,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
      ];

      polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);

      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>, TransactionSpec<[string]>],
        returnValue,
        context
      );

      await queue.run();

      return expect(queue.run()).rejects.toThrow('Cannot re-run a Transaction Queue');
    });
  });

  describe('method: onStatusChange', () => {
    test("should execute a callback when the queue's status changes", async () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
      ];
      polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);
      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>],
        returnValue,
        context
      );

      const listenerStub = sinon.stub();
      queue.onStatusChange(q => listenerStub(q.status));

      await queue.run();

      sinon.assert.calledWith(listenerStub.firstCall, TransactionQueueStatus.Running);
      sinon.assert.calledWith(listenerStub.secondCall, TransactionQueueStatus.Succeeded);
    });

    test('should return an unsubscribe function', async () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: false as false,
        },
      ];
      const transactions = polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);
      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>],
        returnValue,
        context
      );

      const listenerStub = sinon.stub();
      const unsub = queue.onStatusChange(q => listenerStub(q.status));

      queue.run();

      await delay(0);

      unsub();

      polymeshTransactionMockUtils.updateTransactionStatus(
        transactions[0],
        TransactionStatus.Succeeded
      );

      sinon.assert.calledWith(listenerStub.firstCall, TransactionQueueStatus.Running);
      sinon.assert.callCount(listenerStub, 1);
    });
  });

  describe('method: onTransactionStatusChange', () => {
    test("should execute a callback when the a transaction's status changes", async () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: false as false,
        },
      ];
      const transactions = polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);
      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>],
        returnValue,
        context
      );

      const listenerStub = sinon.stub();
      queue.onTransactionStatusChange(transaction => {
        listenerStub(transaction.status);
      });

      const runPromise = queue.run();

      polymeshTransactionMockUtils.updateTransactionStatus(
        transactions[0],
        TransactionStatus.Running
      );
      polymeshTransactionMockUtils.updateTransactionStatus(
        transactions[0],
        TransactionStatus.Succeeded
      );

      await runPromise;

      sinon.assert.calledWith(listenerStub.firstCall, TransactionStatus.Running);
      sinon.assert.calledWith(listenerStub.secondCall, TransactionStatus.Succeeded);
    });

    test('should return an unsubscribe function', async () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: false,
          autoresolve: false as false,
        },
      ];
      const transactions = polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);
      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>],
        returnValue,
        context
      );

      const listenerStub = sinon.stub();
      const unsub = queue.onTransactionStatusChange(transaction => {
        listenerStub(transaction.status);
      });

      const runPromise = queue.run();

      polymeshTransactionMockUtils.updateTransactionStatus(
        transactions[0],
        TransactionStatus.Running
      );
      await delay(0);

      unsub();

      polymeshTransactionMockUtils.updateTransactionStatus(
        transactions[0],
        TransactionStatus.Succeeded
      );

      await runPromise;

      sinon.assert.calledWith(listenerStub.firstCall, TransactionStatus.Running);
      sinon.assert.callCount(listenerStub, 1);
    });
  });

  describe('method: getMinFees', () => {
    test('should return the sum of all transaction fees', async () => {
      const transactionSpecs = [
        {
          args: [1],
          isCritical: true,
          fees: {
            protocol: new BigNumber(100),
            gas: new BigNumber(1),
          },
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
        {
          args: ['someArg'],
          isCritical: true,
          fees: {
            protocol: new BigNumber(50),
            gas: new BigNumber(2),
          },
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
        {
          args: [{ foo: 'bar' }],
          isCritical: true,
          autoresolve: TransactionStatus.Succeeded as TransactionStatus.Succeeded,
        },
      ];

      polymeshTransactionMockUtils.setupNextTransactions(transactionSpecs);

      const returnValue = 3;
      const queue = new TransactionQueue(
        (transactionSpecs as unknown) as [TransactionSpec<[number]>, TransactionSpec<[string]>],
        returnValue,
        context
      );

      const fees = await queue.getMinFees();

      expect(fees).toEqual({
        protocol: new BigNumber(150),
        gas: new BigNumber(3),
      });
    });
  });
});
