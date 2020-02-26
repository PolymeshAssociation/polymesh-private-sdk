import { BigNumber } from 'bignumber.js';

import { Context, PolymeshError } from '~/base';
import { Entity } from '~/base/Entity'; // this import is kept separate to avoid circular dependencies
import { ErrorCode } from '~/types';
import { serialize, unserialize } from '~/utils';

/**
 * Properties that uniquely identify an Identity
 */
export interface UniqueIdentifiers {
  did: string;
}

/**
 * Constructor parameters
 */
export type Params = UniqueIdentifiers;

/**
 * @hidden
 * Checks if a value is of type [[UniqueIdentifiers]]
 */
function isUniqueIdentifiers(identifier: unknown): identifier is UniqueIdentifiers {
  const { did } = identifier as UniqueIdentifiers;

  return typeof did === 'string';
}

/**
 * Used to manage an Identity
 */
export class Identity extends Entity {
  /**
   * Generate the Identity's UUID from its identifying properties
   */
  public static generateUuid({ did }: UniqueIdentifiers): string {
    return serialize('identity', {
      did,
    });
  }

  /**
   * Unserialize a serialized entity
   *
   * @param serialized - string with entity information
   */
  public static unserialize(serialized: string): Record<string, unknown> {
    const unserialized = unserialize(serialized);

    if (!isUniqueIdentifiers(unserialized)) {
      throw new PolymeshError({
        code: ErrorCode.InvalidUuid,
        message: 'The string is not related to an Identity Unique Identifier',
      });
    }

    return unserialized;
  }

  /**
   * Universal unique identifier for entity Identity
   */
  public uuid: string;

  /**
   * Identity ID as stored in the blockchain
   */
  public did: string;

  protected context: Context;

  /**
   * Create an Identity entity
   */
  constructor(params: Params, context: Context) {
    super();

    const { did } = params;

    this.did = did;

    this.context = context;

    this.uuid = Identity.generateUuid({
      did,
    });
  }

  /**
   * Retrieve the POLY balance of this particular Identity
   */
  public getIdentityBalance = async (): Promise<BigNumber> => {
    const { context, did } = this;
    // TODO remove this line when MSDK-29 is done
    const balance = await context.polymeshApi.query.balances.identityBalance(did);
    const result = new BigNumber(balance.toString());
    return result;
  };
}
