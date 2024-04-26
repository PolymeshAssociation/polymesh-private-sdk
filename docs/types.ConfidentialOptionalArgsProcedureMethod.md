# Interface: ConfidentialOptionalArgsProcedureMethod<MethodArgs, ProcedureReturnValue, ReturnValue\>

[types](../wiki/types).ConfidentialOptionalArgsProcedureMethod

## Type parameters

| Name | Type |
| :------ | :------ |
| `MethodArgs` | `MethodArgs` |
| `ProcedureReturnValue` | `ProcedureReturnValue` |
| `ReturnValue` | `ProcedureReturnValue` |

## Callable

### ConfidentialOptionalArgsProcedureMethod

▸ **ConfidentialOptionalArgsProcedureMethod**(`args?`, `opts?`): `Promise`<`GenericPolymeshTransaction`<`ProcedureReturnValue`, `ReturnValue`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `args?` | `MethodArgs` |
| `opts?` | `ProcedureOpts` |

#### Returns

`Promise`<`GenericPolymeshTransaction`<`ProcedureReturnValue`, `ReturnValue`\>\>

## Table of contents

### Properties

- [checkAuthorization](../wiki/types.ConfidentialOptionalArgsProcedureMethod#checkauthorization)

## Properties

### checkAuthorization

• **checkAuthorization**: (`args?`: `MethodArgs`, `opts?`: `ProcedureOpts`) => `Promise`<`ProcedureAuthorizationStatus`\>

#### Type declaration

▸ (`args?`, `opts?`): `Promise`<`ProcedureAuthorizationStatus`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `args?` | `MethodArgs` |
| `opts?` | `ProcedureOpts` |

##### Returns

`Promise`<`ProcedureAuthorizationStatus`\>

#### Defined in

[src/types/index.ts:94](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/types/index.ts#L94)
