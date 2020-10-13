import BigNumber from 'bignumber.js';

import { Instruction } from '~/api/entities';
import { PolymeshError, Procedure } from '~/base';
import { AuthorizationStatus, ErrorCode, InstructionStatus, InstructionType } from '~/types';
import {
  meshAuthorizationStatusToAuthorizationStatus,
  numberToU64,
  portfolioIdToMeshPortfolioId,
} from '~/utils';

export interface ToggleInstructionAuthorizationParams {
  authorize: boolean;
}

/**
 * @hidden
 */
export type Params = ToggleInstructionAuthorizationParams & {
  id: BigNumber;
};

/**
 * @hidden
 */
export async function prepareToggleInstructionAuthorization(
  this: Procedure<Params, Instruction>,
  args: Params
): Promise<Instruction> {
  const {
    context: {
      polymeshApi: {
        tx,
        query: { settlement },
      },
    },
    context,
  } = this;

  const { authorize, id } = args;

  const instruction = new Instruction({ id }, context);

  const [details, currentIdentity] = await Promise.all([
    instruction.details(),
    context.getCurrentIdentity(),
  ]);

  const { status, validFrom } = details;

  if (status !== InstructionStatus.Pending) {
    throw new PolymeshError({
      code: ErrorCode.ValidationError,
      message: 'The Instruction must be in pending state',
    });
  }

  if (validFrom) {
    const now = new Date();

    if (now < validFrom) {
      throw new PolymeshError({
        code: ErrorCode.ValidationError,
        message: 'The instruction has not reached its validity period',
        data: {
          validFrom,
        },
      });
    }
  }

  if (details.type === InstructionType.SettleOnBlock) {
    const latestBlock = await context.getLatestBlock();
    const { endBlock } = details;

    if (latestBlock >= endBlock) {
      throw new PolymeshError({
        code: ErrorCode.ValidationError,
        message: 'The instruction cannot be modified; it has already reached its end block',
        data: {
          currentBlock: latestBlock,
          endBlock,
        },
      });
    }
  }

  const rawInstructionId = numberToU64(id, context);
  const rawPortfolioId = portfolioIdToMeshPortfolioId({ did: currentIdentity.did }, context);
  const rawAuthorizationStatus = await settlement.userAuths(rawPortfolioId, rawInstructionId);
  const authorizationStatus = meshAuthorizationStatusToAuthorizationStatus(rawAuthorizationStatus);

  if (authorize) {
    if (authorizationStatus === AuthorizationStatus.Authorized) {
      throw new PolymeshError({
        code: ErrorCode.ValidationError,
        message: 'The Instruction is already authorized',
      });
    }
    this.addTransaction(tx.settlement.authorizeInstruction, {}, rawInstructionId, [rawPortfolioId]);
  } else {
    if (authorizationStatus === AuthorizationStatus.Pending) {
      throw new PolymeshError({
        code: ErrorCode.ValidationError,
        message: 'The Instruction is not authorized',
      });
    }
    this.addTransaction(tx.settlement.unauthorizeInstruction, {}, rawInstructionId, [
      rawPortfolioId,
    ]);
  }

  return instruction;
}

/**
 * @hidden
 */
export const toggleInstructionAuthorization = new Procedure(prepareToggleInstructionAuthorization);