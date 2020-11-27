import BigNumber from 'bignumber.js';
import { PortfolioId, PortfolioNumber } from 'polymesh-types/types';

import {
  createPortfolio,
  DefaultPortfolio,
  deletePortfolio,
  Identity,
  Namespace,
  NumberedPortfolio,
  PolymeshError,
  TransactionQueue,
} from '~/internal';
import { ErrorCode } from '~/types';
import { identityIdToString, stringToIdentityId, u64ToBigNumber } from '~/utils/conversion';

/**
 * Handles all Portfolio related functionality on the Identity side
 */
export class Portfolios extends Namespace<Identity> {
  /**
   * Retrieve all the Portfolios owned by this Identity
   */
  public async getPortfolios(): Promise<[DefaultPortfolio, ...NumberedPortfolio[]]> {
    const {
      context,
      context: {
        polymeshApi: {
          query: { portfolio },
        },
      },
      parent: { did },
    } = this;

    const identityId = stringToIdentityId(did, context);
    const rawPortfolios = await portfolio.portfolios.entries(identityId);

    const portfolios: [DefaultPortfolio, ...NumberedPortfolio[]] = [
      new DefaultPortfolio({ did }, context),
    ];
    rawPortfolios.forEach(([key]) => {
      portfolios.push(
        new NumberedPortfolio({ id: u64ToBigNumber(key.args[1] as PortfolioNumber), did }, context)
      );
    });

    return portfolios;
  }

  /**
   * Retrieve all Portfolios custodied by this Identity.
   *   This only includes portfolios owned by a different Identity but custodied by this one.
   *   To fetch Portfolios owned by this Identity, use [[getPortfolios]]
   */
  public async getCustodiedPortfolios(): Promise<(DefaultPortfolio | NumberedPortfolio)[]> {
    const {
      context,
      context: {
        polymeshApi: {
          query: { portfolio },
        },
      },
      parent: { did: custodianDid },
    } = this;

    const custodian = stringToIdentityId(custodianDid, context);
    const portfolioEntries = await portfolio.portfoliosInCustody.entries(custodian);

    return portfolioEntries.map(([{ args }]) => {
      const { did: ownerDid, kind } = args[1] as PortfolioId;

      const did = identityIdToString(ownerDid);

      if (kind.isDefault) {
        return new DefaultPortfolio({ did }, context);
      }

      const id = u64ToBigNumber(kind.asUser);

      return new NumberedPortfolio({ did, id }, context);
    });
  }

  /**
   * Retrieve a numbered Portfolio or the default Portfolio if Portfolio ID is not passed
   *
   * @param args.porfolioId - optional, defaults to the default portfolio
   */
  public async getPortfolio(args?: {
    portfolioId: BigNumber;
  }): Promise<DefaultPortfolio | NumberedPortfolio> {
    const {
      context,
      parent: { did },
    } = this;

    const portfolioId = args?.portfolioId;

    if (!portfolioId) {
      return new DefaultPortfolio({ did }, context);
    }

    const numberedPortfolio = new NumberedPortfolio({ id: portfolioId, did }, context);
    const exists = await numberedPortfolio.exists();

    if (!exists) {
      throw new PolymeshError({
        code: ErrorCode.ValidationError,
        message: "The Portfolio doesn't exist",
      });
    }

    return numberedPortfolio;
  }

  /**
   * Create a new Portfolio for the Identity
   */
  public create(args: { name: string }): Promise<TransactionQueue<NumberedPortfolio>> {
    return createPortfolio.prepare(args, this.context);
  }

  /**
   * Delete a Portfolio by ID
   */
  public delete(args: {
    portfolio: BigNumber | NumberedPortfolio;
  }): Promise<TransactionQueue<void>> {
    const {
      parent: { did },
    } = this;

    const { portfolio } = args;
    const id = portfolio instanceof BigNumber ? portfolio : portfolio.id;

    return deletePortfolio.prepare({ id, did }, this.context);
  }
}