["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [DataViewRow](dataviewrow.md)

# Interface: DataViewRow

## Hierarchy

* **DataViewRow**

## Index

### Methods

* [getColor](dataviewrow.md#getcolor)
* [getDimension](dataviewrow.md#getdimension)
* [getMeasure](dataviewrow.md#getmeasure)
* [isMarked](dataviewrow.md#ismarked)
* [mark](dataviewrow.md#mark)

## Methods

###  getColor

▸ **getColor**(): *string*

Defined in build/spotfire-api/spotfire-api.d.ts:276

TODO: Return a PlotDataColorCell containing value, color, base color etc.

**Returns:** *string*

___

###  getDimension

▸ **getDimension**(`name`: string): *[DataViewDimensionValue](dataviewdimensionvalue.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:272

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[DataViewDimensionValue](dataviewdimensionvalue.md)*

___

###  getMeasure

▸ **getMeasure**(`name`: string): *[DataViewMeasureValue](dataviewmeasurevalue.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:273

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[DataViewMeasureValue](dataviewmeasurevalue.md)*

___

###  isMarked

▸ **isMarked**(): *boolean*

Defined in build/spotfire-api/spotfire-api.d.ts:271

**Returns:** *boolean*

___

###  mark

▸ **mark**(`operation?`: [MarkingOperation](../globals.md#markingoperation)): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:274

**Parameters:**

Name | Type |
------ | ------ |
`operation?` | [MarkingOperation](../globals.md#markingoperation) |

**Returns:** *void*
