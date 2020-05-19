["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [Column](column.md)

# Interface: Column

## Hierarchy

* [ColumnValues](columnvalues.md)

  ↳ **Column**

## Index

### Properties

* [dataType](column.md#datatype)
* [name](column.md#name)

### Methods

* [properties](column.md#properties)
* [property](column.md#property)

## Properties

###  dataType

• **dataType**: *string*

*Inherited from [Column](column.md).[dataType](column.md#datatype)*

Defined in build/spotfire-api/spotfire-api.d.ts:56

___

###  name

• **name**: *string*

*Inherited from [Column](column.md).[name](column.md#name)*

Defined in build/spotfire-api/spotfire-api.d.ts:55

## Methods

###  properties

▸ **properties**(): *[Observable](observable.md)‹[Property](property.md)[]›*

Defined in build/spotfire-api/spotfire-api.d.ts:47

**Returns:** *[Observable](observable.md)‹[Property](property.md)[]›*

___

###  property

▸ **property**(`name`: string): *[Partial](../globals.md#partial)‹[Property](property.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:48

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[Partial](../globals.md#partial)‹[Property](property.md)›*
