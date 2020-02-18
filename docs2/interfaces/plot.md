["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [Plot](plot.md)

# Interface: Plot

## Hierarchy

* **Plot**

## Index

### Methods

* [createHierarchy](plot.md#createhierarchy)
* [getAllRows](plot.md#getallrows)

## Methods

###  createHierarchy

▸ **createHierarchy**(`rows`: [DataViewRow](dataviewrow.md)[], `axisName`: string): *[Promise](observable.md#promise)‹[DataViewHierarchyNode](dataviewhierarchynode.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:519

Create a hierarchy from a set of data view rows.

This is a static helper used to transform rows into a hierarchical representation.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`rows` | [DataViewRow](dataviewrow.md)[] | A list of rows to construct the hierarchy from. |
`axisName` | string | The hierarchical axis.  |

**Returns:** *[Promise](observable.md#promise)‹[DataViewHierarchyNode](dataviewhierarchynode.md)›*

___

###  getAllRows

▸ **getAllRows**(`dataView`: [DataView](dataview.md)): *[Promise](observable.md#promise)‹[DataViewRow](dataviewrow.md)[]›*

Defined in build/spotfire-api/spotfire-api.d.ts:528

Gets all rows from the data view as one asynchronous operation.
The getAllRows function has a built in cache and can be called multiple times with the same dataView and it will return the same list of rows.

**NOTE**: This is a helper method for dataView.getIterator(), if you plan to handle many rows it is advised to use the iterator API instead.
If you want to transform each row as it's retrieved, use getIterator() instead.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`dataView` | [DataView](dataview.md) | Data view to get rows from.  |

**Returns:** *[Promise](observable.md#promise)‹[DataViewRow](dataviewrow.md)[]›*
