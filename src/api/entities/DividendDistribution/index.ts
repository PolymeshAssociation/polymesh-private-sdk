import { Option } from '@polkadot/types';
import BigNumber from 'bignumber.js';

import { Checkpoint } from '~/api/entities/Checkpoint';
import { CheckpointSchedule } from '~/api/entities/CheckpointSchedule';
import { Params as CorporateActionParams, UniqueIdentifiers } from '~/api/entities/CorporateAction';
import {
  claimDividends,
  Context,
  CorporateAction,
  DefaultPortfolio,
  modifyDistributionCheckpoint,
  ModifyDistributionCheckpointParams,
  NumberedPortfolio,
  payDividends,
  PayDividendsParams,
  PolymeshError,
} from '~/internal';
import { getHistoryOfClaimsForCA, getWithholdingTaxesOfCA } from '~/middleware/queries';
import { Query } from '~/middleware/types';
import { Distribution } from '~/polkadot';
import {
  CorporateActionKind,
  DividendDistributionDetails,
  Ensured,
  ErrorCode,
  PaymentDistribution,
  ResultSet,
} from '~/types';
import { ProcedureMethod } from '~/types/internal';
import {
  balanceToBigNumber,
  boolToBoolean,
  corporateActionIdentifierToCaId,
} from '~/utils/conversion';
import { calculateNextKey, createProcedureMethod } from '~/utils/internal';

export interface DividendDistributionParams {
  origin: DefaultPortfolio | NumberedPortfolio;
  currency: string;
  perShare: BigNumber;
  maxAmount: BigNumber;
  expiryDate: null | Date;
  paymentDate: Date;
}

export type Params = Omit<CorporateActionParams, 'kind'> & DividendDistributionParams;

/**
 * Represents a Corporate Action via which a Security Token issuer wishes to distribute dividends
 *   between a subset of the Tokenholders (targets)
 */
export class DividendDistribution extends CorporateAction {
  /**
   * Portfolio from which the dividends will be distributed
   */
  public origin: DefaultPortfolio | NumberedPortfolio;

  /**
   * ticker of the currency in which dividends are being distibuted
   */
  public currency: string;

  /**
   * amount of `currency` to pay for each share the Tokenholder holds
   */
  public perShare: BigNumber;

  /**
   * maximum amount of `currency` to be distributed. Distributions are "first come, first served", so funds can be depleted before
   *   every Tokenholder receives their corresponding amount
   */
  public maxAmount: BigNumber;

  /**
   * date after which dividends can no longer be paid/reclaimed. A null value means the distribution never expires
   */
  public expiryDate: null | Date;

  /**
   * date starting from which dividends can be paid/reclaimed
   */
  public paymentDate: Date;

  protected kind!: CorporateActionKind.UnpredictableBenefit;

  /**
   * @hidden
   */
  public constructor(args: UniqueIdentifiers & Params, context: Context) {
    const {
      origin,
      currency,
      perShare,
      maxAmount,
      expiryDate,
      paymentDate,
      ...corporateActionArgs
    } = args;

    super({ ...corporateActionArgs, kind: CorporateActionKind.UnpredictableBenefit }, context);

    this.origin = origin;
    this.currency = currency;
    this.perShare = perShare;
    this.maxAmount = maxAmount;
    this.expiryDate = expiryDate;
    this.paymentDate = paymentDate;

    this.pay = createProcedureMethod(
      {
        getProcedureAndArgs: payDividendsArgs => [
          payDividends,
          { ...payDividendsArgs, distribution: this },
        ],
      },
      context
    );

    this.claim = createProcedureMethod(
      { getProcedureAndArgs: () => [claimDividends, { distribution: this }] },
      context
    );

    this.modifyCheckpoint = createProcedureMethod(
      {
        getProcedureAndArgs: modifyCheckpointArgs => [
          modifyDistributionCheckpoint,
          { distribution: this, ...modifyCheckpointArgs },
        ],
      },
      context
    );
  }

  /**
   * Claim the dividends corresponding to the current Identity
   */
  public claim: ProcedureMethod<void, void>;

  /**
   * Modify the Distribution's checkpoint
   */
  public modifyCheckpoint: ProcedureMethod<ModifyDistributionCheckpointParams, void>;

  /**
   * Transfer the corresponding share of the dividends to a list of Identities
   */
  public pay: ProcedureMethod<PayDividendsParams, void>;

  /**
   * Retrieve the Checkpoint associated with this Dividend Distribution. If the Checkpoint is scheduled and has not been created yet,
   *   the corresponding CheckpointSchedule is returned instead
   */
  public async checkpoint(): Promise<Checkpoint | CheckpointSchedule> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const checkpoint = (await super.checkpoint())!;

    return checkpoint;
  }

  /**
   * Retrieve whether the Distribution exists
   */
  public async exists(): Promise<boolean> {
    const distribution = await this.fetchDistribution();

    return distribution.isSome;
  }

  /**
   * Retrieve details associated with this Dividend Distribution
   */
  public async details(): Promise<DividendDistributionDetails> {
    const distribution = await this.fetchDistribution();

    if (distribution.isNone) {
      throw new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'The Dividend Distribution no longer exists',
      });
    }

    const { reclaimed, remaining } = distribution.unwrap();

    return {
      remainingFunds: balanceToBigNumber(remaining),
      fundsReclaimed: boolToBoolean(reclaimed),
    };
  }

  /**
   * @hidden
   */
  private fetchDistribution(): Promise<Option<Distribution>> {
    const { ticker, id, context } = this;

    return context.polymeshApi.query.capitalDistribution.distributions(
      corporateActionIdentifierToCaId({ ticker, localId: id }, context)
    );
  }

  /**
   * Retrieve the current amount of withheld tax for a given distribution
   *
   * @note uses the middleware
   */
  public async getWithheldTax(opts: { from?: Date; to?: Date } = {}): Promise<BigNumber | null> {
    const { id, ticker, context } = this;

    const { from, to } = opts;

    const result = await context.queryMiddleware<Ensured<Query, 'getWithholdingTaxesOfCA'>>(
      getWithholdingTaxesOfCA({
        CAId: { ticker, localId: id.toNumber() },
        fromDate: from ? from.toISOString().split('T')[0] : null,
        toDate: to ? to.toISOString().split('T')[0] : null,
      })
    );

    if (result.data.getWithholdingTaxesOfCA) {
      return new BigNumber(result.data.getWithholdingTaxesOfCA.taxes);
    }

    return null;
  }

  /**
   * Retrieve the claims history for a given distribution
   *
   * @note uses the middleware
   */
  public async getPaymentsHistory(
    opts: { from?: Date; to?: Date; size?: number; start?: number } = {}
  ): Promise<ResultSet<PaymentDistribution>> {
    const { id, ticker, context } = this;

    const { from, to, size, start } = opts;

    const result = await context.queryMiddleware<Ensured<Query, 'getHistoryOfClaimsForCA'>>(
      getHistoryOfClaimsForCA({
        CAId: { ticker, localId: id.toNumber() },
        fromDate: from ? from.toISOString().split('T')[0] : null,
        toDate: to ? to.toISOString().split('T')[0] : null,
        count: size,
        skip: start,
      })
    );

    const {
      data: { getHistoryOfClaimsForCA: getHistoryOfClaimsForCAResult },
    } = result;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { items, totalCount: count } = getHistoryOfClaimsForCAResult!;

    const data: PaymentDistribution[] = [];
    let next = null;

    if (items) {
      items.forEach(item => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { blockId, eventId, datetime, eventDid: target, balance, tax } = item!;

        data.push({
          blockNumber: new BigNumber(blockId),
          eventId,
          date: new Date(datetime),
          target,
          claimedAmount: new BigNumber(balance),
          taxWithheld: new BigNumber(tax),
        });
      });

      next = calculateNextKey(count, size, start);
    }

    return {
      data,
      next,
      count,
    };
  }
}
