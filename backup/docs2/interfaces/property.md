["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [Property](property.md)

# Interface: Property <**ValueType**>

Properties can be found in multiple places the Spotfire document. In a Document, tables, columns and in the mod itself.

## Type parameters

▪ **ValueType**: *[PropertyDataType](../globals.md#propertydatatype)*

## Hierarchy

* [PropertyValue](propertyvalue.md)‹ValueType›

  ↳ **Property**

## Index

### Properties

* [name](property.md#name)
* [value](property.md#value)

### Methods

* [set](property.md#set)

## Properties

###  name

• **name**: *string*

*Inherited from [Property](property.md).[name](property.md#name)*

Defined in build/spotfire-api/spotfire-api.d.ts:582

___

###  value

• **value**: *ValueType*

*Inherited from [Property](property.md).[value](property.md#value)*

Defined in build/spotfire-api/spotfire-api.d.ts:583

## Methods

###  set

▸ **set**(`value`: [PropertyDataType](../globals.md#propertydatatype)): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:569

**Parameters:**

Name | Type |
------ | ------ |
`value` | [PropertyDataType](../globals.md#propertydatatype) |

**Returns:** *void*
