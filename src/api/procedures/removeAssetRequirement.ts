import { PolymeshError, Procedure, SecurityToken } from '~/internal';
import { ErrorCode, Requirement, TxTags } from '~/types';
import { ProcedureAuthorization } from '~/types/internal';
import { numberToU32, stringToTicker, u32ToBigNumber } from '~/utils/conversion';

export interface RemoveAssetRequirementParams {
  requirement: number | Requirement;
}

/**
 * @hidden
 */
export type Params = RemoveAssetRequirementParams & {
  ticker: string;
};

/**
 * @hidden
 */
export async function prepareRemoveAssetRequirement(
  this: Procedure<Params, SecurityToken>,
  args: Params
): Promise<SecurityToken> {
  const {
    context: {
      polymeshApi: { query, tx },
    },
    context,
  } = this;
  const { ticker, requirement } = args;

  const rawTicker = stringToTicker(ticker, context);

  const reqId = typeof requirement === 'number' ? requirement : requirement.id;

  const { requirements } = await query.complianceManager.assetCompliances(rawTicker);

  if (requirements.filter(({ id: rawId }) => u32ToBigNumber(rawId).eq(reqId)).length) {
    throw new PolymeshError({
      code: ErrorCode.DataUnavailable,
      message: `There is no compliance requirement with id "${reqId}"`,
    });
  }

  this.addTransaction(
    tx.complianceManager.removeComplianceRequirement,
    {},
    rawTicker,
    numberToU32(reqId, context)
  );

  return new SecurityToken({ ticker }, context);
}

/**
 * @hidden
 */
export function getAuthorization(
  this: Procedure<Params, SecurityToken>,
  { ticker }: Params
): ProcedureAuthorization {
  return {
    permissions: {
      transactions: [TxTags.complianceManager.RemoveComplianceRequirement],
      tokens: [new SecurityToken({ ticker }, this.context)],
      portfolios: [],
    },
  };
}

/**
 * @hidden
 */
export const removeAssetRequirement = (): Procedure<Params, SecurityToken> =>
  new Procedure(prepareRemoveAssetRequirement, getAuthorization);