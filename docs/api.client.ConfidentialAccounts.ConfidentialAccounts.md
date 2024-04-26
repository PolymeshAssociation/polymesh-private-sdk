# Class: ConfidentialAccounts

[api/client/ConfidentialAccounts](../wiki/api.client.ConfidentialAccounts).ConfidentialAccounts

Handles all Confidential Account related functionality

## Table of contents

### Properties

- [applyIncomingBalance](../wiki/api.client.ConfidentialAccounts.ConfidentialAccounts#applyincomingbalance)
- [applyIncomingBalances](../wiki/api.client.ConfidentialAccounts.ConfidentialAccounts#applyincomingbalances)
- [createConfidentialAccount](../wiki/api.client.ConfidentialAccounts.ConfidentialAccounts#createconfidentialaccount)

### Methods

- [getConfidentialAccount](../wiki/api.client.ConfidentialAccounts.ConfidentialAccounts#getconfidentialaccount)

## Properties

### applyIncomingBalance

• **applyIncomingBalance**: [`ConfidentialProcedureMethod`](../wiki/types.ConfidentialProcedureMethod)<[`ApplyIncomingBalanceParams`](../wiki/api.entities.ConfidentialAccount.types.ApplyIncomingBalanceParams), [`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount), [`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount)\>

Applies incoming balance to a Confidential Account

#### Defined in

[src/api/client/ConfidentialAccounts.ts:85](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/api/client/ConfidentialAccounts.ts#L85)

___

### applyIncomingBalances

• **applyIncomingBalances**: [`ConfidentialProcedureMethod`](../wiki/types.ConfidentialProcedureMethod)<[`ApplyIncomingConfidentialAssetBalancesParams`](../wiki/api.entities.ConfidentialAccount.types.ApplyIncomingConfidentialAssetBalancesParams), [`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount), [`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount)\>

Applies any incoming balance to a Confidential Account

#### Defined in

[src/api/client/ConfidentialAccounts.ts:93](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/api/client/ConfidentialAccounts.ts#L93)

___

### createConfidentialAccount

• **createConfidentialAccount**: [`ConfidentialProcedureMethod`](../wiki/types.ConfidentialProcedureMethod)<[`CreateConfidentialAccountParams`](../wiki/api.entities.ConfidentialAccount.types.CreateConfidentialAccountParams), [`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount), [`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount)\>

Create a confidential Account

#### Defined in

[src/api/client/ConfidentialAccounts.ts:77](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/api/client/ConfidentialAccounts.ts#L77)

## Methods

### getConfidentialAccount

▸ **getConfidentialAccount**(`args`): `Promise`<[`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount)\>

Retrieve a ConfidentialAccount

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | `Object` |
| `args.publicKey` | `string` |

#### Returns

`Promise`<[`ConfidentialAccount`](../wiki/api.entities.ConfidentialAccount.ConfidentialAccount)\>
