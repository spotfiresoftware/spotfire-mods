["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [ModVisualization](modvisualization.md)

# Interface: ModVisualization

All types of content in the mod that can be read and/or modified by the mod API. Observables can be used as parameters to the `mod.reader` method in order to read the content.

## Hierarchy

* **ModVisualization**

## Index

### Methods

* [axis](modvisualization.md#axis)
* [data](modvisualization.md#data)
* [mainTable](modvisualization.md#maintable)
* [property](modvisualization.md#property)
* [windowSize](modvisualization.md#windowsize)

## Methods

###  axis

▸ **axis**(`name`: string): *[Partial](../globals.md#partial)‹[Axis](axis.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:445

A mod axis.

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[Partial](../globals.md#partial)‹[Axis](axis.md)›*

___

###  data

▸ **data**(): *[PartialDataView](../globals.md#partialdataview)*

Defined in build/spotfire-api/spotfire-api.d.ts:441

A read only representation of the Data view.

**Returns:** *[PartialDataView](../globals.md#partialdataview)*

___

###  mainTable

▸ **mainTable**(): *[Partial](../globals.md#partial)‹[DataTable](datatable.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:443

The main table used in the mod visualization.

**Returns:** *[Partial](../globals.md#partial)‹[DataTable](datatable.md)›*

___

###  property

▸ **property**(`name`: string): *[Partial](../globals.md#partial)‹[Property](property.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:439

Properties can be read and modified to store state in the mod.

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[Partial](../globals.md#partial)‹[Property](property.md)›*

___

###  windowSize

▸ **windowSize**(): *[Observable](observable.md)‹[Size](size.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:447

Read the current mod window size.

**Returns:** *[Observable](observable.md)‹[Size](size.md)›*
