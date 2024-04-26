# Interface: ConfidentialProcedureAuthorizationStatus

[types](../wiki/types).ConfidentialProcedureAuthorizationStatus

## Table of contents

### Properties

- [accountFrozen](../wiki/types.ConfidentialProcedureAuthorizationStatus#accountfrozen)
- [agentPermissions](../wiki/types.ConfidentialProcedureAuthorizationStatus#agentpermissions)
- [noIdentity](../wiki/types.ConfidentialProcedureAuthorizationStatus#noidentity)
- [roles](../wiki/types.ConfidentialProcedureAuthorizationStatus#roles)
- [signerPermissions](../wiki/types.ConfidentialProcedureAuthorizationStatus#signerpermissions)

## Properties

### accountFrozen

• **accountFrozen**: `boolean`

whether the Account is frozen (i.e. can't perform any transactions)

#### Defined in

[src/types/index.ts:176](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/types/index.ts#L176)

___

### agentPermissions

• **agentPermissions**: `CheckPermissionsResult`<`Identity`\>

whether the Identity complies with all required Agent permissions

#### Defined in

[src/types/index.ts:164](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/types/index.ts#L164)

___

### noIdentity

• **noIdentity**: `boolean`

true only if the Procedure requires an Identity but the signing Account
  doesn't have one associated

#### Defined in

[src/types/index.ts:181](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/types/index.ts#L181)

___

### roles

• **roles**: [`ConfidentialCheckRolesResult`](../wiki/types.ConfidentialCheckRolesResult)

whether the Identity complies with all required Roles

#### Defined in

[src/types/index.ts:172](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/types/index.ts#L172)

___

### signerPermissions

• **signerPermissions**: `CheckPermissionsResult`<`Account`\>

whether the Account complies with all required Signer permissions

#### Defined in

[src/types/index.ts:168](https://github.com/PolymeshAssociation/polymesh-private-sdk/blob/2c6aa0b4/src/types/index.ts#L168)
