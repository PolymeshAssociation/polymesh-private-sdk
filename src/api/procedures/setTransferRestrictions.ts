import { bool, StorageKey } from '@polkadot/types';
import {
  PolymeshPrimitivesIdentityId,
  PolymeshPrimitivesTransferComplianceTransferCondition,
  PolymeshPrimitivesTransferComplianceTransferConditionExemptKey,
} from '@polkadot/types/lookup';
import BigNumber from 'bignumber.js';
import { flatten, keys } from 'lodash';
import { TransferCondition } from 'polymesh-types/types';

import { SetTransferRestrictionsParams } from '~/api/entities/Asset/TransferRestrictions/TransferRestrictionBase';
import { Asset, Context, Identity, PolymeshError, Procedure } from '~/internal';
import {
  ClaimCountRestrictionValue,
  ClaimCountTransferRestriction,
  ClaimCountTransferRestrictionInput,
  ClaimPercentageTransferRestriction,
  ClaimPercentageTransferRestrictionInput,
  ClaimType,
  CountTransferRestrictionInput,
  ErrorCode,
  PercentageTransferRestrictionInput,
  TransferRestriction,
  TransferRestrictionType,
  TxTag,
  TxTags,
} from '~/types';
import { ProcedureAuthorization } from '~/types/internal';
import {
  complianceConditionsToBtreeSet,
  identitiesToBtreeSet,
  identityIdToString,
  meshClaimTypeToClaimType,
  stringToTickerKey,
  toExemptKey,
  transferRestrictionToPolymeshTransferCondition,
  transferRestrictionTypeToStatOpType,
  u32ToBigNumber,
} from '~/utils/conversion';
import {
  asIdentity,
  assertStatIsSet,
  checkTxType,
  compareTransferRestrictionToInput,
  neededStatTypeForRestrictionInput,
} from '~/utils/internal';

/**
 * @hidden
 */

type ClaimKey = keyof typeof ClaimType | 'None';
type ExemptionRecords = Partial<Record<ClaimKey, Identity[]>>;

const addExemptionIfNotPresent = (
  toInsertId: Identity,
  exemptionRecords: ExemptionRecords,
  claimType: ClaimKey,
  filterSet: Identity[] = []
): void => {
  const found = filterSet.some(currentId => currentId.did === toInsertId.did);
  if (!found) {
    const entry = exemptionRecords[claimType] || [];
    exemptionRecords[claimType] = [...entry, toInsertId];
  }
};

export interface Storage {
  currentRestrictions: TransferCondition[];
  currentExemptions: ExemptionRecords;
  occupiedSlots: BigNumber;
}
/**
 * @hidden
 *
 * Calculates the smallest change needed to get to the requested state from the current state.
 * While clearing and building the restrictions would be simpler, it would be inefficient use of gas fees
 */
function transformInput(
  inputRestrictions:
    | CountTransferRestrictionInput[]
    | PercentageTransferRestrictionInput[]
    | ClaimCountTransferRestrictionInput[]
    | ClaimPercentageTransferRestrictionInput[],
  currentRestrictions: TransferCondition[],
  currentExemptions: ExemptionRecords,
  type: TransferRestrictionType,
  context: Context
): {
  conditions: PolymeshPrimitivesTransferComplianceTransferCondition[];
  toSetExemptions: ExemptionRecords;
  toRemoveExemptions: ExemptionRecords;
} {
  const toSetExemptions: ExemptionRecords = {};
  const toRemoveExemptions: ExemptionRecords = {};

  let needDifferentConditions = inputRestrictions.length !== currentRestrictions.length;
  const conditions: PolymeshPrimitivesTransferComplianceTransferCondition[] = [];
  const inputExemptions: ExemptionRecords = {};

  // for each restriction check if we need to make a condition and track all exemptions
  inputRestrictions.forEach(restriction => {
    let value: BigNumber | ClaimCountRestrictionValue | ClaimPercentageTransferRestriction;
    let claimType: ClaimType | undefined;
    if ('count' in restriction) {
      value = restriction.count;
    } else if ('percentage' in restriction) {
      value = restriction.percentage;
    } else {
      value = restriction;
      claimType = restriction.claim.type;
    }

    const condition = { type, value } as TransferRestriction;

    const compareConditions = (transferCondition: TransferCondition): boolean =>
      compareTransferRestrictionToInput(transferCondition, condition);
    if (!needDifferentConditions) {
      needDifferentConditions = ![...currentRestrictions].find(compareConditions);
    }
    const rawCondition = transferRestrictionToPolymeshTransferCondition(condition, context);
    conditions.push(rawCondition);

    restriction.exemptedIdentities?.forEach(exemption => {
      const key = claimType || 'None';
      const id = asIdentity(exemption, context);
      addExemptionIfNotPresent(id, inputExemptions, key);
    });
  });

  // calculate exemptions to add — for each input exemption check if it already exists
  Object.entries(inputExemptions).forEach(([cType, toAddIds]) => {
    const key = cType as ClaimKey;
    const currentIds = currentExemptions[key] || [];
    toAddIds.forEach(id => {
      addExemptionIfNotPresent(id, toSetExemptions, key, currentIds);
    });
  });

  // calculate exemptions to remove — for each current exemption check if it was in the input
  Object.entries(currentExemptions).forEach(([cType, currentIds]) => {
    const given = inputExemptions[cType as ClaimKey] || [];
    currentIds.forEach(id => {
      addExemptionIfNotPresent(id, toRemoveExemptions, cType as ClaimKey, given);
    });
  });

  const sizeOf = (obj: Record<string, unknown>): number => keys(obj).length;
  const needDifferentExemptions = sizeOf(toSetExemptions) > 0 || sizeOf(toRemoveExemptions) > 0;
  if (!needDifferentConditions && !needDifferentExemptions) {
    throw new PolymeshError({
      code: ErrorCode.NoDataChange,
      message: 'The restrictions and exemptions are already in place',
    });
  }

  return { conditions, toSetExemptions, toRemoveExemptions };
}

/**
 * @hidden
 */
export async function prepareSetTransferRestrictions(
  this: Procedure<SetTransferRestrictionsParams, BigNumber, Storage>,
  args: SetTransferRestrictionsParams
): Promise<BigNumber> {
  const {
    context: {
      polymeshApi: {
        tx: { statistics },
        consts,
      },
    },
    storage: { currentRestrictions, occupiedSlots, currentExemptions },
    context,
  } = this;
  const {
    restrictions: { length: newRestrictionAmount },
    restrictions,
    type,
    ticker,
  } = args;
  const tickerKey = stringToTickerKey(ticker, context);

  const { conditions, toSetExemptions, toRemoveExemptions } = transformInput(
    restrictions,
    currentRestrictions,
    currentExemptions,
    type,
    context
  );

  const maxTransferConditions = u32ToBigNumber(consts.statistics.maxTransferConditionsPerAsset);
  const finalCount = occupiedSlots.plus(newRestrictionAmount);
  if (finalCount.gte(maxTransferConditions)) {
    throw new PolymeshError({
      code: ErrorCode.LimitExceeded,
      message: 'Cannot set more Transfer Restrictions than there are slots available',
      data: {
        availableSlots: maxTransferConditions.minus(occupiedSlots),
      },
    });
  }

  const transactions = [];
  const op = transferRestrictionTypeToStatOpType(type, context);
  transactions.push(
    checkTxType({
      transaction: statistics.setAssetTransferCompliance,
      args: [tickerKey, complianceConditionsToBtreeSet(conditions, context)],
    })
  );

  const pushExemptions = (exemptions: ExemptionRecords, exempt: boolean): void => {
    Object.entries(exemptions).forEach(([claimType, exempted]) => {
      const rawClaimType = claimType === 'None' ? undefined : (claimType as ClaimType);
      const exemptKey = toExemptKey(tickerKey, op, rawClaimType);
      const exemptedBtreeSet = identitiesToBtreeSet(exempted, context);
      transactions.push(
        checkTxType({
          transaction: statistics.setEntitiesExempt,
          feeMultiplier: new BigNumber(exemptedBtreeSet.size),
          args: [exempt, exemptKey, exemptedBtreeSet],
        })
      );
    });
  };

  pushExemptions(toSetExemptions, true);
  pushExemptions(toRemoveExemptions, false);

  this.addBatchTransaction({ transactions });
  return finalCount;
}

/**
 * @hidden
 */
export function getAuthorization(
  this: Procedure<SetTransferRestrictionsParams, BigNumber, Storage>,
  { ticker, restrictions }: SetTransferRestrictionsParams
): ProcedureAuthorization {
  const transactions: TxTag[] = [TxTags.statistics.SetAssetTransferCompliance];

  const needExemptionsPermission = restrictions.some(r => r.exemptedIdentities?.length);
  if (needExemptionsPermission) {
    transactions.push(TxTags.statistics.SetEntitiesExempt);
  }

  return {
    permissions: {
      assets: [new Asset({ ticker }, this.context)],
      transactions,
      portfolios: [],
    },
  };
}

/**
 * @hidden
 */
export async function prepareStorage(
  this: Procedure<SetTransferRestrictionsParams, BigNumber, Storage>,
  args: SetTransferRestrictionsParams
): Promise<Storage> {
  const {
    context,
    context: {
      polymeshApi: {
        query: { statistics },
      },
    },
  } = this;
  const { ticker, type } = args;

  const tickerKey = stringToTickerKey(ticker, context);

  const currentStats = await statistics.activeAssetStats(tickerKey);

  args.restrictions.forEach(restriction => {
    let claimIssuer;
    if (
      type === TransferRestrictionType.ClaimCount ||
      type === TransferRestrictionType.ClaimPercentage
    ) {
      const {
        claim: { type: claimType },
        issuer,
      } = restriction as ClaimCountTransferRestriction | ClaimPercentageTransferRestriction;
      claimIssuer = { claimType, issuer };
    }
    const neededStat = neededStatTypeForRestrictionInput({ type, claimIssuer }, context);
    assertStatIsSet(currentStats, neededStat);
  });

  const {
    transferRestrictions: { count, percentage, claimCount, claimPercentage },
  } = new Asset({ ticker }, context);

  const [
    { restrictions: currentCountRestrictions },
    { restrictions: currentPercentageRestrictions },
    { restrictions: currentClaimCountRestrictions },
    { restrictions: currentClaimPercentageRestrictions },
  ] = await Promise.all([count.get(), percentage.get(), claimCount.get(), claimPercentage.get()]);

  const currentRestrictions: TransferRestriction[] = [];

  let occupiedSlots =
    currentCountRestrictions.length +
    currentPercentageRestrictions.length +
    currentClaimCountRestrictions.length +
    currentClaimPercentageRestrictions.length;
  if (type === TransferRestrictionType.Count) {
    occupiedSlots -= currentCountRestrictions.length;
  } else if (type === TransferRestrictionType.Percentage) {
    occupiedSlots -= currentPercentageRestrictions.length;
  } else if (type === TransferRestrictionType.ClaimCount) {
    occupiedSlots -= currentClaimCountRestrictions.length;
  } else {
    occupiedSlots -= currentClaimPercentageRestrictions.length;
  }

  if (type === TransferRestrictionType.Count) {
    currentCountRestrictions.forEach(({ count: value }) => {
      const restriction = { type: TransferRestrictionType.Count, value } as const;
      currentRestrictions.push(restriction);
    });
  } else if (type === TransferRestrictionType.Percentage) {
    currentPercentageRestrictions.forEach(({ percentage: value }) => {
      const restriction = { type: TransferRestrictionType.Percentage, value } as const;
      currentRestrictions.push(restriction);
    });
  } else if (type === TransferRestrictionType.ClaimCount) {
    currentClaimCountRestrictions.forEach(({ claim, min, max, issuer }) => {
      const restriction = { type, value: { claim, min, max, issuer } };
      currentRestrictions.push(restriction);
    });
  } else {
    currentClaimPercentageRestrictions.forEach(({ claim, min, max, issuer }) => {
      const restriction = { type, value: { claim, min, max, issuer } };
      currentRestrictions.push(restriction);
    });
  }

  const op = transferRestrictionTypeToStatOpType(type, context);

  const claimTypes =
    type === TransferRestrictionType.Count || type === TransferRestrictionType.Percentage
      ? [undefined]
      : [ClaimType.Accredited, ClaimType.Affiliate, ClaimType.Jurisdiction];
  const exemptionFetchers: Promise<
    [
      StorageKey<
        [
          PolymeshPrimitivesTransferComplianceTransferConditionExemptKey,
          PolymeshPrimitivesIdentityId
        ]
      >,
      bool
    ][]
  >[] = [];

  claimTypes.forEach(claimType => {
    exemptionFetchers.push(
      statistics.transferConditionExemptEntities.entries({
        asset: tickerKey,
        op,
        claimType,
      })
    );
  });
  const rawCurrentExemptions = flatten(await Promise.all(exemptionFetchers));
  const currentExemptions: ExemptionRecords = {};

  rawCurrentExemptions.forEach(
    ([
      {
        args: [{ claimType: rawClaimType }, rawDid],
      },
    ]) => {
      const did = identityIdToString(rawDid);
      let claimType: ClaimKey = 'None';
      if (rawClaimType.isSome) {
        claimType = meshClaimTypeToClaimType(rawClaimType.unwrap());
      }
      const identity = new Identity({ did }, context);
      addExemptionIfNotPresent(identity, currentExemptions, claimType);
    }
  );

  const transformRestriction = (
    restriction: TransferRestriction
  ): PolymeshPrimitivesTransferComplianceTransferCondition => {
    return transferRestrictionToPolymeshTransferCondition(restriction, context);
  };

  return {
    occupiedSlots: new BigNumber(occupiedSlots),
    currentRestrictions: currentRestrictions.map(transformRestriction),
    currentExemptions,
  };
}

/**
 * @hidden
 */
export const setTransferRestrictions = (): Procedure<
  SetTransferRestrictionsParams,
  BigNumber,
  Storage
> => new Procedure(prepareSetTransferRestrictions, getAuthorization, prepareStorage);
