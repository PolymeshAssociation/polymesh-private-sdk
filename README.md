[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![Types](https://img.shields.io/npm/types/@polymeshassociation/polymesh-private-sdk)](https://)
[![npm](https://img.shields.io/npm/v/@polymeshassociation/polymesh-private-sdk)](https://www.npmjs.com/package/@polymeshassociation/polymesh-private-sdk)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=PolymeshAssociation_polymesh-private-sdk&metric=coverage)](https://sonarcloud.io/summary/new_code?id=PolymeshAssociation_polymesh-sdk)
[![Github Actions Workflow](https://github.com/PolymeshAssociation/polymesh-private-sdk/actions/workflows/main.yml/badge.svg)](https://github.com/PolymeshAssociation/polymesh-private-sdk/actions)
[![Sonar Status](https://sonarcloud.io/api/project_badges/measure?project=PolymeshAssociation_polymesh-private-sdk&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=PolymeshAssociation_polymesh-private-sdk)
[![Issues](https://img.shields.io/github/issues/PolymeshAssociation/polymesh-private-sdk)](https://github.com/PolymeshAssociation/polymesh-private-sdk/issues)

## \@polymeshassociation/polymesh-sdk

<!--- This section is autogenerated, do not modify --->

## Polymesh version

This release is compatible with Polymesh v6.3/v7.0 and Polymesh Private v1.0/v2.0

<!--- End of section --->

## Getting Started

This package provides confidential asset support (aka [Polymesh Private](https://polymesh.network/private)) and is an extension of the [public SDK](https://github.com/PolymeshAssociation/polymesh-sdk).

Unless you specifically need confidential asset support, then you should use the public version. If you are adding confidential support then upgrading from public version should be a matter of updating the import from `@polymeshassociation/polymesh-sdk` to `@polymeshassociation/private-polymesh-sdk`, and updating the version. The public API should remain unchanged.

Note, the SDK does not contain any logic around generating confidential proofs. To generate zero knowledge proofs a [confidential proof server](https://github.com/PolymeshAssociation/polymesh-private-proof-api) needs to be available, and integrating code will need to call the right endpoints when appropriate.

### Purpose

The Polymesh Private SDK's provides additional functions to the Polymesh SDK to provide support for confidential assets.

### Technical Pre-requisites

In order to use the Polymesh Private SDK, you must install [node](https://nodejs.org/) \(version 16\) and [npm](https://www.npmjs.com/). The library is written in [typescript](https://www.typescriptlang.org/), but can also be used in plain javascript. This document will assume you are using typescript, but the translation to javascript is very simple.

### Documentation

Polymesh Public SDK API Reference:

https://developers.polymesh.network/sdk-docs/

### How to use

#### Installation

`npm i @polymeshassociation/polymesh-private-sdk --save`

Or, if you're using yarn

`yarn add @polymeshassociation/polymesh-private-sdk`

Or, if using pnpm

`pnpm add @polymeshassociation/polymesh-private-sdk`

**NOTE** it is _highly_ recommended that you use one of these three package managers. This project uses package resolutions/overrides to pin certain problematic dependencies, and these are only supported by the aforementioned package managers. Using a different package manager may result in unexpected behavior

**NOTE** if using TypeScript the compiler option "skipLibCheck" should be set to true in your tsconfig.json file

#### Initializing the client

Before you can start registering Tickers and creating Assets, you have to connect the Polymesh SDK client to a Polymesh node. This is a pretty straightforward process:

```typescript
import { Polymesh } from '@polymeshassociation/polymesh-private-sdk';
import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';

async function run() {
  const signingManager = await LocalSigningManager.create({
    accounts: [
      {
        mnemonic: '//Alice', //A "well known" mnemonic, often with sudo privileges on development chains
      },
      {
        mnemonic: 'forest end mail art wish leave truth else ignore royal knife river' // most mnemonics are 12 words
      }
    ],
  });
  const polyClient = await Polymesh.connect({
    nodeUrl: 'wss://some-node-url.com',
    signingManager,
  });

  // do stuff with the client
}
```

Here is an overview of the parameters passed to the `connect` function:

- `nodeUrl` is a URL that points to a running Polymesh node
- `signingManager` is an object that complies with the `SigningManager` interface. It holds the Accounts capable of signing transactions, and the signing logic itself. In this example, `LocalSigningManager` is a simple signing manager that holds private keys in memory and signs with them

**NOTE:** if using the SDK on a browser environment \(i.e. with the Polymesh wallet browser extension\), you would use the `BrowserExtensionSigningManager` provided by `@polymeshassociation/browser-extension-signing-manager`

```typescript
import { Polymesh } from '@polymeshassociation/polymesh-private-sdk';
import { BrowserExtensionSigningManager } from '@polymeshassociation/browser-extension-signing-manager';

async function run() {
  const signingManager = await BrowserExtensionSigningManager.create('MY_APP_NAME'); // The Polymesh wallet extension will ask the user to authorize MY_APP_NAME for access

  const polyClient = await Polymesh.connect({
    nodeUrl: 'wss://some-node-url.com',
    signingManager,
  });

  // do stuff with the client
}
```

#### Creating Transactions

Creating transactions is a two-step process. First a procedure is created, which validates the chain is likely to accept the transaction and returns a Procedure object. This procedure is then executed. This includes having the signing manager generate a signature and waiting for block finalization. Some procedures resolve to a relevant entity, such as `createAsset` resolving to the created asset.

```typescript
  /**
   * This step performs validations, and will throw an error if the transaction isn't expected to proceed, e.g., if the `ticker` is already in use
   */
  const createAssetProc = await polyClient.assets.createAsset({
    name: 'My new asset'
    ticker: 'TICKER',
    // ... (args omitted for brevity)
  })

  /**
   * The promise will resolve when the transaction is in a finalized block which takes on average 15 seconds. It will throw an error if the transaction fails to finalize.
   * For example, if the `ticker` was claimed after the procedure was created, but before it was executed, or the signing manager didn't generate a correct signature.
   */
  const newAsset = await createAssetProc.run()
```

#### Reading Data

The SDK exposes getter functions that will return entities, which may have their own functions:

```typescript
  const assetsPage = await polyClient.assets.get({ size: new BigNumber(20) })
  const asset = assetsPage.data[0]

  const assetDetails = await asset.details()
  console.log('asset details:', assetDetails)
```

Note: Some getters require "middleware" to be configured, which is a chain indexer that aids in historical queries. All such methods will have a comment indicating this requirement.

### Terminology

The SDK uses the class `Account` as an abstraction for a public/private key pair that is used to sign transactions. Although consistent with [Substrate](https://substrate.io/vision/substrate-and-polkadot/) (the chain's framework) naming conventions, it can be a source of confusion considering the domain. What the SDK calls an account is often referred to as a key. Public keys are often represented in [SS58 format](https://docs.substrate.io/reference/address-formats/) which is a special encoding that indicates if the key is intended for mainnet or not. In this form, it is referred to as an address and looks like: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` (non-mainnet keys begin with **5**, mainnet addresses will instead begin with **2**).

The only thing an `Account` holds is the POLYX utility token. Ownership of any asset on the Polymesh chain requires an `Identity`. This process involves a trusted provider writing a claim to the chain, stating that this person has completed a "customer due diligence" (CDD) process. For development chains, the mnemonic `//Alice` can create CDD claims by default.

Polymesh uses an `Identity` to provide flexibility in managing permissions. Portfolios can be created, and secondary keys can be granted permission to provide fine grained authorization.