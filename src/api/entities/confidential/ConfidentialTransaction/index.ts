import BigNumber from 'bignumber.js';

import { Context, Entity, Identity, PolymeshError } from '~/internal';
import { ConfidentialTransactionDetails, ErrorCode } from '~/types';
import {
  bigNumberToU64,
  identityIdToString,
  meshConfidentialTransactionDetailsToDetails,
  meshConfidentialTransactionStatusToStatus,
  u64ToBigNumber,
} from '~/utils/conversion';

export interface UniqueIdentifiers {
  id: BigNumber;
}

/**
 * Represents a confidential Asset Transaction to be executed on a certain Venue
 */
export class ConfidentialTransaction extends Entity<UniqueIdentifiers, string> {
  /**
   * @hidden
   * Check if a value is of type {@link UniqueIdentifiers}
   */
  public static override isUniqueIdentifiers(identifier: unknown): identifier is UniqueIdentifiers {
    const { id } = identifier as UniqueIdentifiers;

    return id instanceof BigNumber;
  }

  /**
   * Unique identifier number of the settlement transaction
   */
  public id: BigNumber;

  /**
   * @hidden
   */
  public constructor(identifiers: UniqueIdentifiers, context: Context) {
    super(identifiers, context);

    const { id } = identifiers;

    this.id = id;
  }

  /**
   * Fetch details about this transaction
   */
  public async details(): Promise<ConfidentialTransactionDetails> {
    const {
      id,
      context,
      context: {
        polymeshApi: {
          query: { confidentialAsset },
        },
      },
    } = this;

    const rawId = bigNumberToU64(id, context);

    const [rawDetails, rawStatus] = await Promise.all([
      confidentialAsset.transactions(rawId),
      confidentialAsset.transactionStatuses(rawId),
    ]);

    if (rawDetails.isNone || rawStatus.isNone) {
      throw new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message: 'Confidential transaction details were not found',
        data: { id },
      });
    }

    const details = meshConfidentialTransactionDetailsToDetails(rawDetails.unwrap());
    const status = meshConfidentialTransactionStatusToStatus(rawStatus.unwrap());

    return {
      ...details,
      status,
    };
  }

  /**
   * Returns the identities involved in this transaction
   *
   * @throws if the transaction has been completed
   */
  public async getInvolvedParties(): Promise<Identity[]> {
    const {
      id,
      context,
      context: {
        polymeshApi: {
          query: { confidentialAsset },
        },
      },
    } = this;

    const rawId = bigNumberToU64(id, context);

    const rawDids = await confidentialAsset.transactionParties.entries(rawId);

    if (rawDids.length === 0) {
      throw new PolymeshError({
        code: ErrorCode.DataUnavailable,
        message:
          'No involved parties were found for this transaction. Its likely been completed and the chain storage has been pruned',
        data: { id },
      });
    }

    return rawDids.map(([key]) => {
      const rawDid = key.args[1];
      const did = identityIdToString(rawDid);

      return new Identity({ did }, context);
    });
  }

  /**
   * Determine whether this settlement Transaction exists on chain (or existed and was pruned)
   */
  public async exists(): Promise<boolean> {
    const {
      context: {
        polymeshApi: {
          query: { confidentialAsset },
        },
      },
      id,
    } = this;

    if (id.lte(new BigNumber(0))) {
      return false;
    }

    const transactionCounter = await confidentialAsset.transactionCounter();

    return id.lte(u64ToBigNumber(transactionCounter.unwrap()));
  }

  /**
   * Return the settlement Transaction's ID
   */
  public toHuman(): string {
    return this.id.toString();
  }
}
