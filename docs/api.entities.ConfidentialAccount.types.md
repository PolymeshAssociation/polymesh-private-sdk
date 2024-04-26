# Module: api/entities/ConfidentialAccount/types

## Table of contents

### Interfaces

- [ApplyIncomingBalanceParams](../wiki/api.entities.ConfidentialAccount.types.ApplyIncomingBalanceParams)
- [ApplyIncomingConfidentialAssetBalancesParams](../wiki/api.entities.ConfidentialAccount.types.ApplyIncomingConfidentialAssetBalancesParams)
- [ConfidentialAssetBalance](../wiki/api.entities.ConfidentialAccount.types.ConfidentialAssetBalance)
- [CreateConfidentialAccountParams](../wiki/api.entities.ConfidentialAccount.types.CreateConfidentialAccountParams)

### Type Aliases

- [ConfidentialAssetHistoryEntry](../wiki/api.entities.ConfidentialAccount.types#confidentialassethistoryentry)

## Type Aliases

### ConfidentialAssetHistoryEntry

Ƭ **ConfidentialAssetHistoryEntry**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `amount` | `string` |
| `asset` | [`ConfidentialAsset`](../wiki/api.entities.ConfidentialAsset.ConfidentialAsset) |
| `createdAt` | `EventIdentifier` \| ``null`` |
| `eventId` | `EventIdEnum` |

#### Defined in

[src/api/entities/ConfidentialAccount/types.ts:33](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/api/entities/ConfidentialAccount/types.ts#L33)
