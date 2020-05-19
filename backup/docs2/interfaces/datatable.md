["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [DataTable](datatable.md)

# Interface: DataTable

## Hierarchy

* [DataTableValues](datatablevalues.md)

  ↳ **DataTable**

## Index

### Properties

* [columnCount](datatable.md#columncount)
* [name](datatable.md#name)

### Methods

* [column](datatable.md#column)
* [columns](datatable.md#columns)
* [properties](datatable.md#properties)
* [property](datatable.md#property)

## Properties

###  columnCount

• **columnCount**: *number*

*Inherited from [DataTable](datatable.md).[columnCount](datatable.md#columncount)*

Defined in build/spotfire-api/spotfire-api.d.ts:115

___

###  name

• **name**: *string*

*Inherited from [DataTable](datatable.md).[name](datatable.md#name)*

Defined in build/spotfire-api/spotfire-api.d.ts:114

## Methods

###  column

▸ **column**(`name`: string): *[Partial](../globals.md#partial)‹[Column](column.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:105

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[Partial](../globals.md#partial)‹[Column](column.md)›*

___

###  columns

▸ **columns**(): *[Observable](observable.md)‹[Column](column.md)[]›*

Defined in build/spotfire-api/spotfire-api.d.ts:104

Testing

**Returns:** *[Observable](observable.md)‹[Column](column.md)[]›*

___

###  properties

▸ **properties**(): *[Observable](observable.md)‹[Property](property.md)[]›*

Defined in build/spotfire-api/spotfire-api.d.ts:106

**Returns:** *[Observable](observable.md)‹[Property](property.md)[]›*

___

###  property

▸ **property**(`name`: string): *[Partial](../globals.md#partial)‹[Property](property.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:107

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[Partial](../globals.md#partial)‹[Property](property.md)›*
