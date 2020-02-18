["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [SpotfireDocument](spotfiredocument.md)

# Interface: SpotfireDocument

The Spotfire document.!

## Hierarchy

* **SpotfireDocument**

## Index

### Methods

* [activePage](spotfiredocument.md#activepage)
* [pages](spotfiredocument.md#pages)
* [properties](spotfiredocument.md#properties)
* [property](spotfiredocument.md#property)
* [setActivePage](spotfiredocument.md#setactivepage)
* [table](spotfiredocument.md#table)
* [tables](spotfiredocument.md#tables)

## Methods

###  activePage

▸ **activePage**(): *[Partial](../globals.md#partial)‹[Page](page.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:654

**Returns:** *[Partial](../globals.md#partial)‹[Page](page.md)›*

___

###  pages

▸ **pages**(): *[Observable](observable.md)‹[Page](page.md)[]›*

Defined in build/spotfire-api/spotfire-api.d.ts:653

**Returns:** *[Observable](observable.md)‹[Page](page.md)[]›*

___

###  properties

▸ **properties**(): *[Observable](observable.md)‹[Property](property.md)[]›*

Defined in build/spotfire-api/spotfire-api.d.ts:651

**Returns:** *[Observable](observable.md)‹[Property](property.md)[]›*

___

###  property

▸ **property**(`name`: string): *[Partial](../globals.md#partial)‹[Property](property.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:652

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[Partial](../globals.md#partial)‹[Property](property.md)›*

___

###  setActivePage

▸ **setActivePage**(`name`: string): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:655

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *void*

___

###  table

▸ **table**(`name`: string): *[Partial](../globals.md#partial)‹[DataTable](datatable.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:650

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[Partial](../globals.md#partial)‹[DataTable](datatable.md)›*

___

###  tables

▸ **tables**(): *[Observable](observable.md)‹[DataTable](datatable.md)[]›*

Defined in build/spotfire-api/spotfire-api.d.ts:649

**Returns:** *[Observable](observable.md)‹[DataTable](datatable.md)[]›*
