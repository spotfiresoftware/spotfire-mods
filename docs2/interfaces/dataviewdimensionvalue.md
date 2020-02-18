["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [DataViewDimensionValue](dataviewdimensionvalue.md)

# Interface: DataViewDimensionValue

Represents a value of a dimension/categorical axis for one row in a data view.

## Hierarchy

* **DataViewDimensionValue**

## Index

### Properties

* [axisName](dataviewdimensionvalue.md#axisname)
* [keys](dataviewdimensionvalue.md#optional-keys)
* [path](dataviewdimensionvalue.md#path)

### Methods

* [getValue](dataviewdimensionvalue.md#getvalue)

## Properties

###  axisName

• **axisName**: *string*

Defined in build/spotfire-api/spotfire-api.d.ts:192

Gets the name of the axis, as declared in the mod-manifest.json.

___

### `Optional` keys

• **keys**? : *undefined | string[]*

Defined in build/spotfire-api/spotfire-api.d.ts:205

Gets the keys that identifies the corresponding entries of path in the source data base system.

___

###  path

• **path**: *string[]*

Defined in build/spotfire-api/spotfire-api.d.ts:197

Gets an array representing the full path of the value in the hierarcy defined by the axis expression.
The first value is the top level of the hierarchy and the last value is the leaf level.

## Methods

###  getValue

▸ **getValue**(): *string*

Defined in build/spotfire-api/spotfire-api.d.ts:201

Gets a string representing the full path.

**Returns:** *string*
