import {
  Context,
  Identity,
  modifyCorporateActionsAgent,
  ModifyCorporateActionsAgentParams,
  Namespace,
  removeCorporateActionsAgent,
  SecurityToken,
} from '~/internal';
import { ProcedureMethod } from '~/types/internal';
import { identityIdToString, stringToTicker } from '~/utils/conversion';
import { createProcedureMethod } from '~/utils/internal';

import { Distributions } from './Distributions';

/**
 * Handles all Security Token Corporate Actions related functionality
 */
export class CorporateActions extends Namespace<SecurityToken> {
  public distributions: Distributions;

  /**
   * @hidden
   */
  constructor(parent: SecurityToken, context: Context) {
    super(parent, context);

    const { ticker } = parent;

    this.distributions = new Distributions(parent, context);

    this.setAgent = createProcedureMethod(
      args => [modifyCorporateActionsAgent, { ticker, ...args }],
      context
    );

    this.removeAgent = createProcedureMethod(
      () => [removeCorporateActionsAgent, { ticker }],
      context
    );
  }

  /**
   * Assign a new Corporate Actions Agent for the Security Token
   *
   * @param args.target - identity to be set as Corporate Actions Agent
   * @param args.requestExpiry - date at which the authorization request to modify the Corporate Actions Agent expires (optional, never expires if a date is not provided)
   *
   * @note this may create AuthorizationRequests which have to be accepted by
   *   the corresponding Account. An Account or Identity can
   *   fetch its pending Authorization Requests by calling `authorizations.getReceived`
   *
   * @note required role:
   *   - Security Token Owner
   */
  public setAgent: ProcedureMethod<ModifyCorporateActionsAgentParams, void>;

  /**
   * Remove the Corporate Actions Agent of the Security Token
   *
   * @note this action will leave the Security Token owner as the Corporate Actions Agent
   *
   * @note required role:
   *   - Security Token Owner
   */
  public removeAgent: ProcedureMethod<void, void>;

  /**
   * Retrieve the Security Token's Corporate Actions agent
   */
  public async getAgent(): Promise<Identity> {
    const {
      context: {
        polymeshApi: {
          query: { corporateAction },
        },
      },
      parent: { ticker },
      context,
    } = this;

    const rawTicker = stringToTicker(ticker, context);

    const agent = await corporateAction.agent(rawTicker);

    if (agent.isNone) {
      const token = new SecurityToken({ ticker }, context);
      const { owner } = await token.details();
      return owner;
    }

    return new Identity({ did: identityIdToString(agent.unwrap()) }, context);
  }
}