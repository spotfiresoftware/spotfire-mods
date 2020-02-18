["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [DataViewMeasureValue](dataviewmeasurevalue.md)

# Interface: DataViewMeasureValue

Represents a value of a measure/continuous axis for one row in a data view.

## Hierarchy

* **DataViewMeasureValue**

## Index

### Properties

* [axisName](dataviewmeasurevalue.md#axisname)

### Methods

* [getFormattedValue](dataviewmeasurevalue.md#getformattedvalue)
* [getValue](dataviewmeasurevalue.md#getvalue)
* [isValid](dataviewmeasurevalue.md#isvalid)

## Properties

###  axisName

• **axisName**: *string*

Defined in build/spotfire-api/spotfire-api.d.ts:230

Gets the name of the axis, as declared in the mod-manifest.json.

## Methods

###  getFormattedValue

▸ **getFormattedValue**(): *string*

Defined in build/spotfire-api/spotfire-api.d.ts:244

Gets a formatted string that can be used to display this measure. The numerical value is
formatted using the formatting settings in Spotfire.

**Returns:** *string*

___

###  getValue

▸ **getValue**(): *number*

Defined in build/spotfire-api/spotfire-api.d.ts:239

Gets the numerical value of this measue.

**Returns:** *number*

___

###  isValid

▸ **isValid**(): *boolean*

Defined in build/spotfire-api/spotfire-api.d.ts:235

Returns a boolean that is true if this value is valid and false otherwise.
A value can be invalid if it cannot be computed for instance due to missing/invalid data.

**Returns:** *boolean*
