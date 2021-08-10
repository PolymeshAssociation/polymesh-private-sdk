import { CustomPermissionGroup } from '~/api/entities/CustomPermissionGroup';
import { KnownPermissionGroup } from '~/api/entities/KnownPermissionGroup';
import { Context, Identity } from '~/internal';
import {
  agentGroupToPermissionGroup,
  stringToIdentityId,
  stringToTicker,
} from '~/utils/conversion';

export interface UniqueIdentifiers {
  did: string;
  ticker: string;
}

/**
 * Represents an agent for a Security Token
 */
export class Agent extends Identity {
  /**
   * @hidden
   * Check if a value is of type [[UniqueIdentifiers]]
   */
  public static isUniqueIdentifiers(identifier: unknown): identifier is UniqueIdentifiers {
    const { did, ticker } = identifier as UniqueIdentifiers;

    return typeof did === 'string' && typeof ticker === 'string';
  }

  /**
   * ticker of the Security Token
   */
  public ticker: string;

  /**
   * @hidden
   */
  public constructor(identifiers: UniqueIdentifiers, context: Context) {
    super(identifiers, context);

    const { ticker } = identifiers;

    this.ticker = ticker;
  }

  /**
   * Retrieve the agent group associated with this Agent
   */
  public async getPermissionGroup(): Promise<CustomPermissionGroup | KnownPermissionGroup> {
    const {
      context: {
        polymeshApi: {
          query: { externalAgents },
        },
      },
      context,
      ticker,
      did,
    } = this;

    const rawTicker = stringToTicker(ticker, context);
    const rawIdentityId = stringToIdentityId(did, context);

    const rawGroupPermissions = await externalAgents.groupOfAgent(rawTicker, rawIdentityId);

    const agentGroup = rawGroupPermissions.unwrap();

    return agentGroupToPermissionGroup(agentGroup, ticker, context);
  }
}
