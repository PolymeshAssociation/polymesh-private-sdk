/* eslint-disable */
const http = require('http');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const util = require('util');
const { forEach, camelCase, mapKeys } = require('lodash');
const { NODE_URL, SCHEMA_PORT } = require('./consts');

const definitionsDir = path.resolve('src', 'polkadot');
const typesDir = path.resolve(definitionsDir, 'polymesh');
const generatedDir = path.resolve('src', 'generated');

rimraf.sync(typesDir);
fs.mkdirSync(typesDir);

rimraf.sync(generatedDir);
fs.mkdirSync(generatedDir);

/**
 * @hidden
 * transforms the schema so RPC types are compatible with other methods from the polkadot api.
 * @note imports are added into the generated files in the postProcessTypes script
 */
function transformSchema(schemaObj) {
  let {
    rpc: { identity, asset, settlement },
  } = schemaObj;

  camelCaseParamNames(identity.getFilteredAuthorizations);
  identity.getFilteredAuthorizations.type = 'Vec<PolymeshPrimitivesAuthorization>';

  camelCaseKeys(schemaObj, 'types', 'ComplianceRequirementResult');

  camelCaseKeys(schemaObj, 'types', 'Condition');
  schemaObj.types.Condition.issuers = 'Vec<PolymeshPrimitivesConditionTrustedIssuer>';

  camelCaseKeys(schemaObj, 'types', 'TrustedIssuer');

  camelCaseParamNames(asset.canTransferGranular);
  asset.canTransferGranular.params[0].type = 'Option<PolymeshPrimitivesIdentityId>';
  asset.canTransferGranular.params[2].type = 'Option<PolymeshPrimitivesIdentityId>';

  camelCaseParamNames(settlement.getExecuteInstructionInfo);
  camelCaseKeys(schemaObj, 'types', 'ExecuteInstructionInfo');
}

function camelCaseKeys(schemaObj, section, field) {
  const newField = mapKeys(schemaObj[section][field], (v, k) => camelCase(k));
  schemaObj[section][field] = newField;
}

function camelCaseParamNames(field) {
  field.params = field.params.map(p => ({
    ...p,
    name: camelCase(p.name),
  }));
}

function writeDefinitions(schemaObj) {
  const { types, rpc: rpcModules } = schemaObj;

  fs.writeFileSync(
    path.resolve(typesDir, 'definitions.ts'),
    `/* eslint-disable @typescript-eslint/naming-convention */\nexport default ${util.inspect(
      { rpc: {}, types },
      {
        compact: false,
        depth: null,
        maxArrayLength: null,
      }
    )}`
  );

  fs.writeFileSync(
    path.resolve(definitionsDir, 'schema.ts'),
    `/* eslint-disable @typescript-eslint/naming-convention */\nexport default ${util.inspect(
      schemaObj,
      {
        compact: false,
        depth: null,
        maxArrayLength: null,
      }
    )}`
  );

  let defExports =
    "/* istanbul ignore file */\n\nexport { default as polymesh } from './polymesh/definitions';\n";

  forEach(rpcModules, (rpc, moduleName) => {
    const moduleDir = path.resolve(definitionsDir, moduleName);

    rimraf.sync(moduleDir);
    fs.mkdirSync(moduleDir);

    fs.writeFileSync(
      path.resolve(moduleDir, 'definitions.ts'),
      `/* eslint-disable @typescript-eslint/naming-convention */\nexport default ${util.inspect(
        { rpc, types: {} },
        {
          compact: false,
          depth: null,
          maxArrayLength: null,
        }
      )}`
    );

    defExports = `${defExports}export { default as ${moduleName} } from './${moduleName}/definitions';\n`;
  });

  fs.writeFileSync(path.resolve(definitionsDir, 'definitions.ts'), defExports);
}

http.get(`http://${NODE_URL}:${SCHEMA_PORT}/polymesh_schema.json`, res => {
  const chunks = [];
  res.on('data', chunk => {
    chunks.push(chunk);
  });

  res.on('end', () => {
    const schema = Buffer.concat(chunks);
    // const schemaObj = JSON.parse(schema);
    const schemaObj = {
      types: {
        Address: 'MultiAddress',
        LookupSource: 'MultiAddress',
        AccountInfo: 'AccountInfoWithDualRefCount',
        IdentityId: '[u8; 32]',
        EventDid: 'IdentityId',
        EventCounts: 'Vec<u32>',
        ErrorAt: '(u32, DispatchError)',
        Ticker: '[u8; 12]',
        CddId: '[u8; 32]',
        PosRatio: '(u32, u32)',
        DocumentId: 'u32',
        DocumentName: 'Text',
        DocumentUri: 'Text',
        DocumentHash: {
          _enum: {
            None: '',
            H512: '[u8; 64]',
            H384: '[u8; 48]',
            H320: '[u8; 40]',
            H256: '[u8; 32]',
            H224: '[u8; 28]',
            H192: '[u8; 24]',
            H160: '[u8; 20]',
            H128: '[u8; 16]',
          },
        },
        DocumentType: 'Text',
        Document: {
          uri: 'DocumentUri',
          content_hash: 'DocumentHash',
          name: 'DocumentName',
          doc_type: 'Option<DocumentType>',
          filing_date: 'Option<Moment>',
        },
        Version: 'u8',
        CustomAssetTypeId: 'u32',
        AssetType: {
          _enum: {
            EquityCommon: '',
            EquityPreferred: '',
            Commodity: '',
            FixedIncome: '',
            REIT: '',
            Fund: '',
            RevenueShareAgreement: '',
            StructuredProduct: '',
            Derivative: '',
            Custom: 'CustomAssetTypeId',
            StableCoin: '',
            NonFungible: 'NonFungibleType',
          },
        },
        AssetIdentifier: {
          _enum: {
            CUSIP: '[u8; 9]',
            CINS: '[u8; 9]',
            ISIN: '[u8; 12]',
            LEI: '[u8; 20]',
            FIGI: '[u8; 12]',
          },
        },
        AssetOwnershipRelation: {
          _enum: {
            NotOwned: '',
            TickerOwned: '',
            AssetOwned: '',
          },
        },
        AssetName: 'Text',
        FundingRoundName: 'Text',
        VenueDetails: 'Text',
        SecurityToken: {
          total_supply: 'Balance',
          owner_did: 'IdentityId',
          divisible: 'bool',
          asset_type: 'AssetType',
        },
        AssetMetadataName: 'Text',
        AssetMetadataValue: 'Vec<u8>',
        AssetMetadataLocalKey: 'u64',
        AssetMetadataGlobalKey: 'u64',
        AssetMetadataKey: {
          _enum: {
            Global: 'u64',
            Local: 'u64',
          },
        },
        AssetMetadataLockStatus: {
          _enum: {
            Unlocked: '',
            Locked: '',
            LockedUntil: 'Moment',
          },
        },
        AssetMetadataValueDetail: {
          expire: 'Option<Moment>',
          lock_status: 'AssetMetadataLockStatus',
        },
        AssetMetadataDescription: 'Text',
        AssetMetadataSpec: {
          url: 'Option<Url>',
          description: 'Option<AssetMetadataDescription>',
          type_def: 'Option<Vec<u8>>',
        },
        PalletName: 'Text',
        DispatchableName: 'Text',
        AssetPermissions: {
          _enum: {
            Whole: '',
            These: 'Vec<Ticker>',
            Except: 'Vec<Ticker>',
          },
        },
        PortfolioPermissions: {
          _enum: {
            Whole: '',
            These: 'Vec<PortfolioId>',
            Except: 'Vec<PortfolioId>',
          },
        },
        DispatchableNames: {
          _enum: {
            Whole: '',
            These: 'Vec<DispatchableName>',
            Except: 'Vec<DispatchableName>',
          },
        },
        PalletPermissions: {
          pallet_name: 'PalletName',
          dispatchable_names: 'DispatchableNames',
        },
        ExtrinsicPermissions: {
          _enum: {
            Whole: '',
            These: 'Vec<PalletPermissions>',
            Except: 'Vec<PalletPermissions>',
          },
        },
        Permissions: {
          asset: 'AssetPermissions',
          extrinsic: 'ExtrinsicPermissions',
          portfolio: 'PortfolioPermissions',
        },
        Signatory: {
          _enum: {
            Identity: 'IdentityId',
            Account: 'AccountId',
          },
        },
        SecondaryKey: {
          key: 'AccountId',
          permissions: 'Permissions',
        },
        SecondaryKeyWithAuth: {
          secondary_key: 'SecondaryKey',
          auth_signature: 'H512',
        },
        Subsidy: {
          paying_key: 'AccountId',
          remaining: 'Balance',
        },
        IdentityRole: {
          _enum: [
            'Issuer',
            'SimpleTokenIssuer',
            'Validator',
            'ClaimIssuer',
            'Investor',
            'NodeRunner',
            'PM',
            'CDDAMLClaimIssuer',
            'AccreditedInvestorClaimIssuer',
            'VerifiedIdentityClaimIssuer',
          ],
        },
        PreAuthorizedKeyInfo: {
          target_id: 'IdentityId',
          secondary_key: 'SecondaryKey',
        },
        DidRecord: {
          primary_key: 'Option<AccountId>',
        },
        KeyRecord: {
          _enum: {
            PrimaryKey: 'IdentityId',
            SecondaryKey: '(IdentityId, Permissions)',
            MultiSigSignerKey: 'AccountId',
          },
        },
        KeyIdentityData: {
          identity: 'IdentityId',
          permissions: 'Option<Permissions>',
        },
        CountryCode: {
          _enum: [
            'AF',
            'AX',
            'AL',
            'DZ',
            'AS',
            'AD',
            'AO',
            'AI',
            'AQ',
            'AG',
            'AR',
            'AM',
            'AW',
            'AU',
            'AT',
            'AZ',
            'BS',
            'BH',
            'BD',
            'BB',
            'BY',
            'BE',
            'BZ',
            'BJ',
            'BM',
            'BT',
            'BO',
            'BA',
            'BW',
            'BV',
            'BR',
            'VG',
            'IO',
            'BN',
            'BG',
            'BF',
            'BI',
            'KH',
            'CM',
            'CA',
            'CV',
            'KY',
            'CF',
            'TD',
            'CL',
            'CN',
            'HK',
            'MO',
            'CX',
            'CC',
            'CO',
            'KM',
            'CG',
            'CD',
            'CK',
            'CR',
            'CI',
            'HR',
            'CU',
            'CY',
            'CZ',
            'DK',
            'DJ',
            'DM',
            'DO',
            'EC',
            'EG',
            'SV',
            'GQ',
            'ER',
            'EE',
            'ET',
            'FK',
            'FO',
            'FJ',
            'FI',
            'FR',
            'GF',
            'PF',
            'TF',
            'GA',
            'GM',
            'GE',
            'DE',
            'GH',
            'GI',
            'GR',
            'GL',
            'GD',
            'GP',
            'GU',
            'GT',
            'GG',
            'GN',
            'GW',
            'GY',
            'HT',
            'HM',
            'VA',
            'HN',
            'HU',
            'IS',
            'IN',
            'ID',
            'IR',
            'IQ',
            'IE',
            'IM',
            'IL',
            'IT',
            'JM',
            'JP',
            'JE',
            'JO',
            'KZ',
            'KE',
            'KI',
            'KP',
            'KR',
            'KW',
            'KG',
            'LA',
            'LV',
            'LB',
            'LS',
            'LR',
            'LY',
            'LI',
            'LT',
            'LU',
            'MK',
            'MG',
            'MW',
            'MY',
            'MV',
            'ML',
            'MT',
            'MH',
            'MQ',
            'MR',
            'MU',
            'YT',
            'MX',
            'FM',
            'MD',
            'MC',
            'MN',
            'ME',
            'MS',
            'MA',
            'MZ',
            'MM',
            'NA',
            'NR',
            'NP',
            'NL',
            'AN',
            'NC',
            'NZ',
            'NI',
            'NE',
            'NG',
            'NU',
            'NF',
            'MP',
            'NO',
            'OM',
            'PK',
            'PW',
            'PS',
            'PA',
            'PG',
            'PY',
            'PE',
            'PH',
            'PN',
            'PL',
            'PT',
            'PR',
            'QA',
            'RE',
            'RO',
            'RU',
            'RW',
            'BL',
            'SH',
            'KN',
            'LC',
            'MF',
            'PM',
            'VC',
            'WS',
            'SM',
            'ST',
            'SA',
            'SN',
            'RS',
            'SC',
            'SL',
            'SG',
            'SK',
            'SI',
            'SB',
            'SO',
            'ZA',
            'GS',
            'SS',
            'ES',
            'LK',
            'SD',
            'SR',
            'SJ',
            'SZ',
            'SE',
            'CH',
            'SY',
            'TW',
            'TJ',
            'TZ',
            'TH',
            'TL',
            'TG',
            'TK',
            'TO',
            'TT',
            'TN',
            'TR',
            'TM',
            'TC',
            'TV',
            'UG',
            'UA',
            'AE',
            'GB',
            'US',
            'UM',
            'UY',
            'UZ',
            'VU',
            'VE',
            'VN',
            'VI',
            'WF',
            'EH',
            'YE',
            'ZM',
            'ZW',
            'BQ',
            'CW',
            'SX',
          ],
        },
        Scope: {
          _enum: {
            Identity: 'IdentityId',
            Ticker: 'Ticker',
            Custom: 'Vec<u8>',
          },
        },
        CustomClaimTypeId: 'u32',
        Claim: {
          _enum: {
            Accredited: 'Scope',
            Affiliate: 'Scope',
            BuyLockup: 'Scope',
            SellLockup: 'Scope',
            CustomerDueDiligence: 'CddId',
            KnowYourCustomer: 'Scope',
            Jurisdiction: '(CountryCode, Scope)',
            Exempted: 'Scope',
            Blocked: 'Scope',
            Custom: '(CustomClaimTypeId, Option<Scope>)',
          },
        },
        ClaimType: {
          _enum: {
            Accredited: '',
            Affiliate: '',
            BuyLockup: '',
            SellLockup: '',
            CustomerDueDiligence: '',
            KnowYourCustomer: '',
            Jurisdiction: '',
            Exempted: '',
            Blocked: '',
            Custom: 'CustomClaimTypeId',
          },
        },
        IdentityClaim: {
          claim_issuer: 'IdentityId',
          issuance_date: 'Moment',
          last_update_date: 'Moment',
          expiry: 'Option<Moment>',
          claim: 'Claim',
        },
        ComplianceRequirement: {
          sender_conditions: 'Vec<Condition>',
          receiver_conditions: 'Vec<Condition>',
          id: 'u32',
        },
        ComplianceRequirementResult: {
          sender_conditions: 'Vec<ConditionResult>',
          receiver_conditions: 'Vec<ConditionResult>',
          id: 'u32',
          result: 'bool',
        },
        ConditionType: {
          _enum: {
            IsPresent: 'Claim',
            IsAbsent: 'Claim',
            IsAnyOf: 'Vec<Claim>',
            IsNoneOf: 'Vec<Claim>',
            IsIdentity: 'TargetIdentity',
          },
        },
        TrustedFor: {
          _enum: {
            Any: '',
            Specific: 'Vec<ClaimType>',
          },
        },
        TrustedIssuer: {
          issuer: 'IdentityId',
          trusted_for: 'TrustedFor',
        },
        Condition: {
          condition_type: 'ConditionType',
          issuers: 'Vec<TrustedIssuer>',
        },
        ConditionResult: {
          condition: 'Condition',
          result: 'bool',
        },
        TargetIdAuthorization: {
          target_id: 'IdentityId',
          nonce: 'u64',
          expires_at: 'Moment',
        },
        TickerRegistration: {
          owner: 'IdentityId',
          expiry: 'Option<Moment>',
        },
        TickerRegistrationConfig: {
          max_ticker_length: 'u8',
          registration_length: 'Option<Moment>',
        },
        EthereumAddress: '[u8; 20]',
        EcdsaSignature: '[u8; 65]',
        MotionTitle: 'Text',
        MotionInfoLink: 'Text',
        ChoiceTitle: 'Text',
        Motion: {
          title: 'MotionTitle',
          info_link: 'MotionInfoLink',
          choices: 'Vec<ChoiceTitle>',
        },
        BallotTitle: 'Text',
        BallotMeta: {
          title: 'BallotTitle',
          motions: 'Vec<Motion>',
        },
        BallotTimeRange: {
          start: 'Moment',
          end: 'Moment',
        },
        BallotVote: {
          power: 'Balance',
          fallback: 'Option<u16>',
        },
        MaybeBlock: {
          _enum: {
            Some: 'BlockNumber',
            None: '',
          },
        },
        Url: 'Text',
        PipDescription: 'Text',
        PipsMetadata: {
          id: 'PipId',
          url: 'Option<Url>',
          description: 'Option<PipDescription>',
          created_at: 'BlockNumber',
          transaction_version: 'u32',
          expiry: 'MaybeBlock',
        },
        Proposer: {
          _enum: {
            Community: 'AccountId',
            Committee: 'Committee',
          },
        },
        Committee: {
          _enum: {
            Technical: '',
            Upgrade: '',
          },
        },
        SkippedCount: 'u8',
        SnapshottedPip: {
          id: 'PipId',
          weight: '(bool, Balance)',
        },
        SnapshotId: 'u32',
        SnapshotMetadata: {
          created_at: 'BlockNumber',
          made_by: 'AccountId',
          id: 'SnapshotId',
        },
        SnapshotResult: {
          _enum: {
            Approve: '',
            Reject: '',
            Skip: '',
          },
        },
        Beneficiary: {
          id: 'IdentityId',
          amount: 'Balance',
        },
        DepositInfo: {
          owner: 'AccountId',
          amount: 'Balance',
        },
        PolymeshVotes: {
          index: 'u32',
          ayes: 'Vec<IdentityId>',
          nays: 'Vec<IdentityId>',
          expiry: 'MaybeBlock',
        },
        PipId: 'u32',
        ProposalState: {
          _enum: ['Pending', 'Rejected', 'Scheduled', 'Failed', 'Executed', 'Expired'],
        },
        Pip: {
          id: 'PipId',
          proposal: 'Call',
          proposer: 'Proposer',
        },
        ProposalData: {
          _enum: {
            Hash: 'Hash',
            Proposal: 'Vec<u8>',
          },
        },
        OffChainSignature: 'MultiSignature',
        Authorization: {
          authorization_data: 'AuthorizationData',
          authorized_by: 'IdentityId',
          expiry: 'Option<Moment>',
          auth_id: 'u64',
        },
        AuthorizationData: {
          _enum: {
            AttestPrimaryKeyRotation: 'IdentityId',
            RotatePrimaryKey: '',
            TransferTicker: 'Ticker',
            AddMultiSigSigner: 'AccountId',
            TransferAssetOwnership: 'Ticker',
            JoinIdentity: 'Permissions',
            PortfolioCustody: 'PortfolioId',
            BecomeAgent: '(Ticker, AgentGroup)',
            AddRelayerPayingKey: '(AccountId, AccountId, Balance)',
            RotatePrimaryKeyToSecondary: 'Permissions',
          },
        },
        AuthorizationNonce: 'u64',
        Percentage: 'Permill',
        RestrictionResult: {
          _enum: ['Valid', 'Invalid', 'ForceValid'],
        },
        Memo: '[u8; 32]',
        BridgeTx: {
          nonce: 'u32',
          recipient: 'AccountId',
          amount: 'Balance',
          tx_hash: 'H256',
        },
        AssetScope: {
          _enum: {
            Ticker: 'Ticker',
          },
        },
        StatOpType: {
          _enum: ['Count', 'Balance'],
        },
        StatType: {
          op: 'StatOpType',
          claim_issuer: 'Option<(ClaimType, IdentityId)>',
        },
        StatClaim: {
          _enum: {
            Accredited: 'bool',
            Affiliate: 'bool',
            Jurisdiction: 'Option<CountryCode>',
          },
        },
        Stat1stKey: {
          asset: 'AssetScope',
          stat_type: 'StatType',
        },
        Stat2ndKey: {
          _enum: {
            NoClaimStat: '',
            Claim: 'StatClaim',
          },
        },
        StatUpdate: {
          key2: 'Stat2ndKey',
          value: 'Option<u128>',
        },
        TransferCondition: {
          _enum: {
            MaxInvestorCount: 'u64',
            MaxInvestorOwnership: 'Percentage',
            ClaimCount: '(StatClaim, IdentityId, u64, Option<u64>)',
            ClaimOwnership: '(StatClaim, IdentityId, Percentage, Percentage)',
          },
        },
        AssetTransferCompliance: {
          paused: 'bool',
          requirements: 'Vec<TransferCondition>',
        },
        TransferConditionExemptKey: {
          asset: 'AssetScope',
          op: 'StatOpType',
          claim_type: 'Option<ClaimType>',
        },
        AssetCompliance: {
          paused: 'bool',
          requirements: 'Vec<ComplianceRequirement>',
        },
        AssetComplianceResult: {
          paused: 'bool',
          requirements: 'Vec<ComplianceRequirementResult>',
          result: 'bool',
        },
        Claim1stKey: {
          target: 'IdentityId',
          claim_type: 'ClaimType',
        },
        Claim2ndKey: {
          issuer: 'IdentityId',
          scope: 'Option<Scope>',
        },
        InactiveMember: {
          id: 'IdentityId',
          deactivated_at: 'Moment',
          expiry: 'Option<Moment>',
        },
        VotingResult: {
          ayes_count: 'u32',
          ayes_stake: 'Balance',
          nays_count: 'u32',
          nays_stake: 'Balance',
        },
        ProtocolOp: {
          _enum: [
            'AssetRegisterTicker',
            'AssetIssue',
            'AssetAddDocuments',
            'AssetCreateAsset',
            'CheckpointCreateSchedule',
            'ComplianceManagerAddComplianceRequirement',
            'IdentityCddRegisterDid',
            'IdentityAddClaim',
            'IdentityAddSecondaryKeysWithAuthorization',
            'PipsPropose',
            'ContractsPutCode',
            'CorporateBallotAttachBallot',
            'CapitalDistributionDistribute',
            'NFTCreateCollection',
            'NFTMint',
            'IdentityCreateChildIdentity',
          ],
        },
        CddStatus: {
          _enum: {
            Ok: 'IdentityId',
            Err: 'Vec<u8>',
          },
        },
        AssetDidResult: {
          _enum: {
            Ok: 'IdentityId',
            Err: 'Vec<u8>',
          },
        },
        RpcDidRecordsSuccess: {
          primary_key: 'AccountId',
          secondary_keys: 'Vec<SecondaryKey>',
        },
        RpcDidRecords: {
          _enum: {
            Success: 'RpcDidRecordsSuccess',
            IdNotFound: 'Vec<u8>',
          },
        },
        VoteCountProposalFound: {
          ayes: 'u64',
          nays: 'u64',
        },
        VoteCount: {
          _enum: {
            ProposalFound: 'VoteCountProposalFound',
            ProposalNotFound: '',
          },
        },
        Vote: '(bool, Balance)',
        VoteByPip: {
          pip: 'PipId',
          vote: 'Vote',
        },
        BridgeTxDetail: {
          amount: 'Balance',
          status: 'BridgeTxStatus',
          execution_block: 'BlockNumber',
          tx_hash: 'H256',
        },
        BridgeTxStatus: {
          _enum: {
            Absent: '',
            Pending: 'u8',
            Frozen: '',
            Timelocked: '',
            Handled: '',
          },
        },
        HandledTxStatus: {
          _enum: {
            Success: '',
            Error: 'Text',
          },
        },
        CappedFee: 'u64',
        CanTransferResult: {
          _enum: {
            Ok: 'u8',
            Err: 'Vec<u8>',
          },
        },
        AuthorizationType: {
          _enum: {
            AttestPrimaryKeyRotation: '',
            RotatePrimaryKey: '',
            TransferTicker: '',
            AddMultiSigSigner: '',
            TransferAssetOwnership: '',
            JoinIdentity: '',
            PortfolioCustody: '',
            BecomeAgent: '',
            AddRelayerPayingKey: '',
            RotatePrimaryKeyToSecondary: '',
          },
        },
        ProposalDetails: {
          approvals: 'u64',
          rejections: 'u64',
          status: 'ProposalStatus',
          expiry: 'Option<Moment>',
          auto_close: 'bool',
        },
        ProposalStatus: {
          _enum: {
            Invalid: '',
            ActiveOrExpired: '',
            ExecutionSuccessful: '',
            ExecutionFailed: '',
            Rejected: '',
          },
        },
        DidStatus: {
          _enum: {
            Unknown: '',
            Exists: '',
            CddVerified: '',
          },
        },
        PortfolioName: 'Text',
        PortfolioNumber: 'u64',
        PortfolioKind: {
          _enum: {
            Default: '',
            User: 'PortfolioNumber',
          },
        },
        PortfolioId: {
          did: 'IdentityId',
          kind: 'PortfolioKind',
        },
        Moment: 'u64',
        CalendarUnit: {
          _enum: ['Second', 'Minute', 'Hour', 'Day', 'Week', 'Month', 'Year'],
        },
        CalendarPeriod: {
          unit: 'CalendarUnit',
          amount: 'u64',
        },
        CheckpointSchedule: {
          start: 'Moment',
          period: 'CalendarPeriod',
        },
        CheckpointId: 'u64',
        ScheduleId: 'u64',
        StoredSchedule: {
          schedule: 'CheckpointSchedule',
          id: 'ScheduleId',
          at: 'Moment',
          remaining: 'u32',
        },
        ScheduleSpec: {
          start: 'Option<Moment>',
          period: 'CalendarPeriod',
          remaining: 'u32',
        },
        InstructionStatus: {
          _enum: {
            Unknown: '',
            Pending: '',
            Failed: '',
          },
        },
        LegStatus: {
          _enum: {
            PendingTokenLock: '',
            ExecutionPending: '',
            ExecutionToBeSkipped: '(AccountId, u64)',
          },
        },
        AffirmationStatus: {
          _enum: {
            Unknown: '',
            Pending: '',
            Affirmed: '',
          },
        },
        SettlementType: {
          _enum: {
            SettleOnAffirmation: '',
            SettleOnBlock: 'BlockNumber',
            SettleManual: 'BlockNumber',
          },
        },
        LegId: 'u64',
        InstructionId: 'u64',
        Instruction: {
          instruction_id: 'InstructionId',
          venue_id: 'VenueId',
          status: 'InstructionStatus',
          settlement_type: 'SettlementType',
          created_at: 'Option<Moment>',
          trade_date: 'Option<Moment>',
          value_date: 'Option<Moment>',
        },
        Venue: {
          creator: 'IdentityId',
          venue_type: 'VenueType',
        },
        Receipt: {
          receipt_uid: 'u64',
          from: 'PortfolioId',
          to: 'PortfolioId',
          asset: 'Ticker',
          amount: 'Balance',
        },
        ReceiptMetadata: 'Text',
        ReceiptDetails: {
          receipt_uid: 'u64',
          leg_id: 'LegId',
          signer: 'AccountId',
          signature: 'OffChainSignature',
          metadata: 'ReceiptMetadata',
        },
        UniqueCall: {
          nonce: 'u64',
          call: 'Call',
        },
        MovePortfolioItem: {
          ticker: 'Ticker',
          amount: 'Balance',
          memo: 'Option<Memo>',
        },
        WeightToFeeCoefficient: {
          coeffInteger: 'Balance',
          coeffFrac: 'Perbill',
          negative: 'bool',
          degree: 'u8',
        },
        WeightPerClass: {
          baseExtrinsic: 'Weight',
          maxExtrinsic: 'Option<Weight>',
          maxTotal: 'Option<Weight>',
          reserved: 'Option<Weight>',
        },
        TargetIdentity: {
          _enum: {
            ExternalAgent: '',
            Specific: 'IdentityId',
          },
        },
        FundraiserId: 'u64',
        FundraiserName: 'Text',
        FundraiserStatus: {
          _enum: ['Live', 'Frozen', 'Closed', 'ClosedEarly'],
        },
        FundraiserTier: {
          total: 'Balance',
          price: 'Balance',
          remaining: 'Balance',
        },
        Fundraiser: {
          creator: 'IdentityId',
          offering_portfolio: 'PortfolioId',
          offering_asset: 'Ticker',
          raising_portfolio: 'PortfolioId',
          raising_asset: 'Ticker',
          tiers: 'Vec<FundraiserTier>',
          venue_id: 'VenueId',
          start: 'Moment',
          end: 'Option<Moment>',
          status: 'FundraiserStatus',
          minimum_investment: 'Balance',
        },
        VenueId: 'u64',
        VenueType: {
          _enum: ['Other', 'Distribution', 'Sto', 'Exchange'],
        },
        Tax: 'Permill',
        TargetIdentities: {
          identities: 'Vec<IdentityId>',
          treatment: 'TargetTreatment',
        },
        TargetTreatment: {
          _enum: ['Include', 'Exclude'],
        },
        CAKind: {
          _enum: [
            'PredictableBenefit',
            'UnpredictableBenefit',
            'IssuerNotice',
            'Reorganization',
            'Other',
          ],
        },
        CADetails: 'Text',
        CACheckpoint: {
          _enum: {
            Scheduled: '(ScheduleId, u64)',
            Existing: 'CheckpointId',
          },
        },
        RecordDate: {
          date: 'Moment',
          checkpoint: 'CACheckpoint',
        },
        RecordDateSpec: {
          _enum: {
            Scheduled: 'Moment',
            ExistingSchedule: 'ScheduleId',
            Existing: 'CheckpointId',
          },
        },
        CorporateAction: {
          kind: 'CAKind',
          decl_date: 'Moment',
          record_date: 'Option<RecordDate>',
          targets: 'TargetIdentities',
          default_withholding_tax: 'Tax',
          withholding_tax: 'Vec<(IdentityId, Tax)>',
        },
        InitiateCorporateActionArgs: {
          ticker: 'Ticker',
          kind: 'CAKind',
          decl_date: 'Moment',
          record_date: 'Option<RecordDateSpec>',
          details: 'CADetails',
          targets: 'Option<TargetIdentities>',
          default_withholding_tax: 'Option<Tax>',
          withholding_tax: 'Option<Vec<(IdentityId, Tax)>>',
        },
        LocalCAId: 'u32',
        CAId: {
          ticker: 'Ticker',
          local_id: 'LocalCAId',
        },
        Distribution: {
          from: 'PortfolioId',
          currency: 'Ticker',
          per_share: 'Balance',
          amount: 'Balance',
          remaining: 'Balance',
          reclaimed: 'bool',
          payment_at: 'Moment',
          expires_at: 'Option<Moment>',
        },
        SlashingSwitch: {
          _enum: ['Validator', 'ValidatorAndNominator', 'None'],
        },
        PriceTier: {
          total: 'Balance',
          price: 'Balance',
        },
        PermissionedIdentityPrefs: {
          intended_count: 'u32',
          running_count: 'u32',
        },
        CanTransferGranularReturn: {
          _enum: {
            Ok: 'GranularCanTransferResult',
            Err: 'DispatchError',
          },
        },
        GranularCanTransferResult: {
          invalid_granularity: 'bool',
          self_transfer: 'bool',
          invalid_receiver_cdd: 'bool',
          invalid_sender_cdd: 'bool',
          receiver_custodian_error: 'bool',
          sender_custodian_error: 'bool',
          sender_insufficient_balance: 'bool',
          portfolio_validity_result: 'PortfolioValidityResult',
          asset_frozen: 'bool',
          transfer_condition_result: 'Vec<TransferConditionResult>',
          compliance_result: 'AssetComplianceResult',
          result: 'bool',
          consumed_weight: 'Option<Weight>',
        },
        PortfolioValidityResult: {
          receiver_is_same_portfolio: 'bool',
          sender_portfolio_does_not_exist: 'bool',
          receiver_portfolio_does_not_exist: 'bool',
          sender_insufficient_balance: 'bool',
          result: 'bool',
        },
        TransferConditionResult: {
          condition: 'TransferCondition',
          result: 'bool',
        },
        AGId: 'u32',
        AgentGroup: {
          _enum: {
            Full: '',
            Custom: 'AGId',
            ExceptMeta: '',
            PolymeshV1CAA: '',
            PolymeshV1PIA: '',
          },
        },
        Member: {
          id: 'IdentityId',
          expiry_at: 'Option<Moment>',
          inactive_from: 'Option<Moment>',
        },
        ItnRewardStatus: {
          _enum: {
            Unclaimed: 'Balance',
            Claimed: '',
          },
        },
        NFTId: 'u64',
        NFTs: {
          ticker: 'Ticker',
          ids: 'Vec<NFTId>',
        },
        FungibleToken: {
          ticker: 'Ticker',
          amount: 'Balance',
        },
        OffChainAsset: {
          ticker: 'Ticker',
          amount: 'Balance',
        },
        FungibleLeg: {
          sender: 'PortfolioId',
          receiver: 'PortfolioId',
          ticker: 'Ticker',
          amount: 'Balance',
        },
        NonFungibleLeg: {
          sender: 'PortfolioId',
          receiver: 'PortfolioId',
          nfts: 'NFTs',
        },
        OffChainLeg: {
          sender_identity: 'IdentityId',
          receiver_identity: 'IdentityId',
          ticker: 'Ticker',
          amount: 'Balance',
        },
        Leg: {
          _enum: {
            Fungible: 'FungibleLeg',
            NonFungible: 'NonFungibleLeg',
            OffChain: 'OffChainLeg',
          },
        },
        FundDescription: {
          _enum: {
            Fungible: 'FungibleToken',
            NonFungible: 'NFTs',
          },
        },
        Fund: {
          description: 'FundDescription',
          memo: 'Option<Memo>',
        },
        NonFungibleType: {
          _enum: {
            Derivative: '',
            FixedIncome: '',
            Invoice: '',
            Custom: 'CustomAssetTypeId',
          },
        },
        ExecuteInstructionInfo: {
          fungible_tokens: 'u32',
          non_fungible_tokens: 'u32',
          off_chain_assets: 'u32',
          consumed_weight: 'Weight',
          error: 'Option<String>',
        },
        AssetCount: {
          fungible_tokens: 'u32',
          non_fungible_tokens: 'u32',
          off_chain_assets: 'u32',
        },
        AffirmationCount: {
          sender_asset_count: 'AssetCount',
          receiver_asset_count: 'AssetCount',
          offchain_count: 'u32',
        },
      },
      rpc: {
        identity: {
          isIdentityHasValidCdd: {
            description: 'use to tell whether the given did has valid cdd claim or not',
            params: [
              {
                name: 'did',
                type: 'IdentityId',
                isOptional: false,
              },
              {
                name: 'buffer_time',
                type: 'u64',
                isOptional: true,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'CddStatus',
          },
          getAssetDid: {
            description: 'function is used to query the given ticker DID',
            params: [
              {
                name: 'ticker',
                type: 'Ticker',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'AssetDidResult',
          },
          getDidRecords: {
            description: 'Used to get the did record values for a given DID',
            params: [
              {
                name: 'did',
                type: 'IdentityId',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'RpcDidRecords',
          },
          getDidStatus: {
            description: 'Retrieve status of the DID',
            params: [
              {
                name: 'did',
                type: 'Vec<IdentityId>',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<DidStatus>',
          },
          getFilteredAuthorizations: {
            description:
              'Retrieve authorizations data for a given signatory and filtered using the given authorization type',
            params: [
              {
                name: 'signatory',
                type: 'Signatory',
                isOptional: false,
              },
              {
                name: 'allow_expired',
                type: 'bool',
                isOptional: false,
              },
              {
                name: 'auth_type',
                type: 'AuthorizationType',
                isOptional: true,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<Authorization>',
          },
          getKeyIdentityData: {
            description: 'Query relation between a signing key and a DID',
            params: [
              {
                name: 'acc',
                type: 'AccountId',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Option<KeyIdentityData>',
          },
          validCDDClaims: {
            description:
              'Returns all valid IdentityClaim of type CustomerDueDiligence for the given target_identity',
            params: [
              {
                name: 'target_identity',
                type: 'IdentityId',
                isOptional: false,
              },
              {
                name: 'cdd_checker_leeway',
                type: 'u64',
                isOptional: true,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<IdentityClaim>',
          },
        },
        pips: {
          getVotes: {
            description: 'Summary of votes of a proposal given by index',
            params: [
              {
                name: 'index',
                type: 'PipId',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'VoteCount',
          },
          proposedBy: {
            description: 'Retrieves proposal indices started by address',
            params: [
              {
                name: 'address',
                type: 'AccountId',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<PipId>',
          },
          votedOn: {
            description: 'Retrieves proposal address indices voted on',
            params: [
              {
                name: 'address',
                type: 'AccountId',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<PipId>',
          },
        },
        protocolFee: {
          computeFee: {
            description: 'Gets the fee of a chargeable extrinsic operation',
            params: [
              {
                name: 'op',
                type: 'ProtocolOp',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'CappedFee',
          },
        },
        staking: {
          getCurve: {
            description: 'Retrieves curves parameters',
            params: [
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<(Perbill, Perbill)>',
          },
        },
        asset: {
          canTransferGranular: {
            description:
              'Checks whether a transaction with given parameters can take place or not. The result is granular meaning each check is run and returned regardless of outcome.',
            params: [
              {
                name: 'from_custodian',
                type: 'Option<IdentityId>',
                isOptional: false,
              },
              {
                name: 'from_portfolio',
                type: 'PortfolioId',
                isOptional: false,
              },
              {
                name: 'to_custodian',
                type: 'Option<IdentityId>',
                isOptional: false,
              },
              {
                name: 'to_portfolio',
                type: 'PortfolioId',
                isOptional: false,
              },
              {
                name: 'ticker',
                type: 'Ticker',
                isOptional: false,
              },
              {
                name: 'value',
                type: 'Balance',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'CanTransferGranularReturn',
          },
        },
        group: {
          getCDDValidMembers: {
            description: 'Get the CDD members',
            params: [
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<Member>',
          },
          getGCValidMembers: {
            description: 'Get the GC members',
            params: [
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'Vec<Member>',
          },
        },
        nft: {
          validateNFTTransfer: {
            description:
              'Verifies if and the sender and receiver are not the same, if both have valid balances, if the sender owns the nft, and if all compliance rules are being respected.',
            params: [
              {
                name: 'sender_portfolio',
                type: 'PortfolioId',
                isOptional: false,
              },
              {
                name: 'receiver_portfolio',
                type: 'PortfolioId',
                isOptional: false,
              },
              {
                name: 'nfts',
                type: 'NFTs',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'DispatchResult',
          },
        },
        settlement: {
          getExecuteInstructionInfo: {
            description:
              'Returns an ExecuteInstructionInfo instance, containing the consumed weight and the number of tokens in the instruction.',
            params: [
              {
                name: 'instruction_id',
                type: 'InstructionId',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'ExecuteInstructionInfo',
          },
          getAffirmationCount: {
            description:
              'Returns an instance of AffirmationCount, which holds the asset count for both the sender and receiver and the number of offchain assets in the instruction',
            params: [
              {
                name: 'instruction_id',
                type: 'InstructionId',
                isOptional: false,
              },
              {
                name: 'portfolios',
                type: 'Vec<PortfolioId>',
                isOptional: false,
              },
              {
                name: 'blockHash',
                type: 'Hash',
                isOptional: true,
              },
            ],
            type: 'AffirmationCount',
          },
        },
      },
      runtime: {
        AssetApi: [
          {
            methods: {
              can_transfer_granular: {
                description:
                  'Checks whether a transaction with given parameters can take place or not. The result is granular meaning each check is run and returned regardless of outcome.',
                params: [
                  {
                    name: 'from_custodian',
                    type: 'Option<IdentityId>',
                  },
                  {
                    name: 'from_portfolio',
                    type: 'PortfolioId',
                  },
                  {
                    name: 'to_custodian',
                    type: 'Option<IdentityId>',
                  },
                  {
                    name: 'to_portfolio',
                    type: 'PortfolioId',
                  },
                  {
                    name: 'ticker',
                    type: 'Ticker',
                  },
                  {
                    name: 'value',
                    type: 'Balance',
                  },
                ],
                type: 'CanTransferGranularReturn',
              },
            },
            version: 3,
          },
        ],
        GroupApi: [
          {
            methods: {
              get_cdd_valid_members: {
                description: 'Get the CDD members',
                params: [],
                type: 'Vec<Member>',
              },
              get_gc_valid_members: {
                description: 'Get the GC members',
                params: [],
                type: 'Vec<Member>',
              },
            },
            version: 1,
          },
        ],
        IdentityApi: [
          {
            methods: {
              is_identity_has_valid_cdd: {
                description: 'use to tell whether the given did has valid cdd claim or not',
                params: [
                  {
                    name: 'did',
                    type: 'IdentityId',
                  },
                  {
                    name: 'buffer_time',
                    type: 'Option<u64>',
                  },
                ],
                type: 'CddStatus',
              },
              get_asset_did: {
                description: 'function is used to query the given ticker DID',
                params: [
                  {
                    name: 'ticker',
                    type: 'Ticker',
                  },
                ],
                type: 'AssetDidResult',
              },
              get_did_records: {
                description: 'Used to get the did record values for a given DID',
                params: [
                  {
                    name: 'did',
                    type: 'IdentityId',
                  },
                ],
                type: 'RpcDidRecords',
              },
              get_did_status: {
                description: 'Retrieve status of the DID',
                params: [
                  {
                    name: 'did',
                    type: 'Vec<IdentityId>',
                  },
                ],
                type: 'Vec<DidStatus>',
              },
              get_filtered_authorizations: {
                description:
                  'Retrieve authorizations data for a given signatory and filtered using the given authorization type',
                params: [
                  {
                    name: 'signatory',
                    type: 'Signatory',
                  },
                  {
                    name: 'allow_expired',
                    type: 'bool',
                  },
                  {
                    name: 'auth_type',
                    type: 'Option<AuthorizationType>',
                  },
                ],
                type: 'Vec<Authorization>',
              },
              get_key_identity_data: {
                description: 'Query relation between a signing key and a DID',
                params: [
                  {
                    name: 'acc',
                    type: 'AccountId',
                  },
                ],
                type: 'Option<KeyIdentityData>',
              },
              valid_cdd_claims: {
                description:
                  'Returns all valid IdentityClaim of type CustomerDueDiligence for the given target_identity',
                params: [
                  {
                    name: 'target_identity',
                    type: 'IdentityId',
                  },
                  {
                    name: 'cdd_checker_leeway',
                    type: 'Option<u64>',
                  },
                ],
                type: 'Vec<IdentityClaim>',
              },
            },
            version: 3,
          },
        ],
        NFTApi: [
          {
            methods: {
              validate_nft_transfer: {
                description:
                  'Verifies if and the sender and receiver are not the same, if both have valid balances, if the sender owns the nft, and if all compliance rules are being respected.',
                params: [
                  {
                    name: 'sender_portfolio',
                    type: 'PortfolioId',
                  },
                  {
                    name: 'receiver_portfolio',
                    type: 'PortfolioId',
                  },
                  {
                    name: 'nfts',
                    type: 'NFTs',
                  },
                ],
                type: 'DispatchResult',
              },
            },
            version: 1,
          },
        ],
        SettlementApi: [
          {
            methods: {
              get_execute_instruction_info: {
                description:
                  'Returns an ExecuteInstructionInfo instance containing the consumed weight and the number of tokens in the instruction.',
                params: [
                  {
                    name: 'instruction_id',
                    type: 'InstructionId',
                  },
                ],
                type: 'ExecuteInstructionInfo',
              },
              get_affirmation_count: {
                description:
                  'Returns an AffirmationCount instance containing the number of assets being sent/received from portfolios, and the number of off-chain assets in the instruction.',
                params: [
                  {
                    name: 'instruction_id',
                    type: 'InstructionId',
                  },
                  {
                    name: 'portfolios',
                    type: 'Vec<PortfolioId>',
                  },
                ],
                type: 'AffirmationCount',
              },
            },
            version: 1,
          },
        ],
        PipsApi: [
          {
            methods: {
              get_votes: {
                description: 'Summary of votes of a proposal given by index',
                params: [
                  {
                    name: 'index',
                    type: 'PipId',
                  },
                ],
                type: 'VoteCount',
              },
              proposed_by: {
                description: 'Retrieves proposal indices started by address',
                params: [
                  {
                    name: 'address',
                    type: 'AccountId',
                  },
                ],
                type: 'Vec<PipId>',
              },
              voted_on: {
                description: 'Retrieves proposal address indices voted on',
                params: [
                  {
                    name: 'address',
                    type: 'AccountId',
                  },
                ],
                type: 'Vec<PipId>',
              },
            },
            version: 1,
          },
        ],
        ProtocolFeeApi: [
          {
            methods: {
              compute_fee: {
                description: 'Gets the fee of a chargeable extrinsic operation',
                params: [
                  {
                    name: 'op',
                    type: 'ProtocolOp',
                  },
                ],
                type: 'CappedFee',
              },
            },
            version: 1,
          },
        ],
        StakingApi: [
          {
            methods: {
              get_curve: {
                description: 'Retrieves curves parameters',
                params: [],
                type: 'Vec<(Perbill, Perbill)>',
              },
            },
            version: 1,
          },
        ],
      },
      signedExtensions: {
        StoreCallMetadata: {
          extrinsic: {},
          payload: {},
        },
      },
    };
    transformSchema(schemaObj);

    writeDefinitions(schemaObj);
  });
});
