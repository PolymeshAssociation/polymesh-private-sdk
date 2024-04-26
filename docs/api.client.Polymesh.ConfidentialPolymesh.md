# Class: ConfidentialPolymesh

[api/client/Polymesh](../wiki/api.client.Polymesh).ConfidentialPolymesh

Main entry point of the Polymesh SDK

## Hierarchy

- `Polymesh`

  ↳ **`ConfidentialPolymesh`**

## Table of contents

### Properties

- [confidentialAccounts](../wiki/api.client.Polymesh.ConfidentialPolymesh#confidentialaccounts)
- [confidentialAssets](../wiki/api.client.Polymesh.ConfidentialPolymesh#confidentialassets)
- [confidentialSettlements](../wiki/api.client.Polymesh.ConfidentialPolymesh#confidentialsettlements)

### Methods

- [connect](../wiki/api.client.Polymesh.ConfidentialPolymesh#connect)

## Properties

### confidentialAccounts

• **confidentialAccounts**: [`ConfidentialAccounts`](../wiki/api.client.ConfidentialAccounts.ConfidentialAccounts)

A set of methods for managing confidential Accounts

#### Defined in

[src/api/client/Polymesh.ts:91](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/api/client/Polymesh.ts#L91)

___

### confidentialAssets

• **confidentialAssets**: [`ConfidentialAssets`](../wiki/api.client.ConfidentialAssets.ConfidentialAssets)

A set of methods for interacting with Confidential Assets

#### Defined in

[src/api/client/Polymesh.ts:81](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/api/client/Polymesh.ts#L81)

___

### confidentialSettlements

• **confidentialSettlements**: [`ConfidentialSettlements`](../wiki/api.client.ConfidentialSettlements.ConfidentialSettlements)

A set of methods for exchanging confidential Assets

#### Defined in

[src/api/client/Polymesh.ts:86](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/api/client/Polymesh.ts#L86)

## Methods

### connect

▸ `Static` **connect**(`params`): `Promise`<[`ConfidentialPolymesh`](../wiki/api.client.Polymesh.ConfidentialPolymesh)\>

Create an SDK instance and connect to a Polymesh node

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`ConnectParams`](../wiki/api.client.Polymesh.ConnectParams) |

#### Returns

`Promise`<[`ConfidentialPolymesh`](../wiki/api.client.Polymesh.ConfidentialPolymesh)\>

#### Overrides

PublicPolymesh.connect
