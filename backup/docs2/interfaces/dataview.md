["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [DataView](dataview.md)

# Interface: DataView

Temporary Data View interface.

## Hierarchy

* **DataView**

## Index

### Properties

* [rows](dataview.md#rows)

### Methods

* [clearMarking](dataview.md#clearmarking)
* [getError](dataview.md#geterror)
* [getIterator](dataview.md#getiterator)
* [getMetadata](dataview.md#getmetadata)
* [isValid](dataview.md#isvalid)
* [mark](dataview.md#mark)

## Properties

###  rows

• **rows**: *object*

Defined in build/spotfire-api/spotfire-api.d.ts:154

The rows property can be used to asynchronously iterate all rows via the `for await ()` syntax.

NOTE: The rows can only be iterated once.

In older JavaScript environments the iterator can be retrieved via the getIterator() method.

**`example`** 
```
const rows = [];
for await (const row of dataView.rows) {
    rows.push(row);
}
```

#### Type declaration:

* **[Symbol.asyncIterator]**(): *AsyncIterator‹[DataViewRow](dataviewrow.md)›*

## Methods

###  clearMarking

▸ **clearMarking**(): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:165

Clears the current marking

**Returns:** *void*

___

###  getError

▸ **getError**(): *[Promise](observable.md#promise)‹string›*

Defined in build/spotfire-api/spotfire-api.d.ts:176

Gets an error message when the dataView is not valid.

**Returns:** *[Promise](observable.md#promise)‹string›*

___

###  getIterator

▸ **getIterator**(): *[DataViewRowIterator](dataviewrowiterator.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:139

Gets the row iterator. The iterator is used to retrieve rows from the data view. The iterator can only be retrieved and consumed once per data view.

Using the iterator directly allows much more flexibility compared to the `getAllRows` helper function.
It is possible to check if the dataView is valid and abort the fetch if needed. It is also possible to track progress since the total row count is known via the `getRowCount` method.

**`example`** 
```
let iterator = dataView.getIterator();
let rows = [];
let row = await iterator.next()
while(!row.done) {
    rows.push(row.value);
    row = await iterator.next()
}
```

**Returns:** *[DataViewRowIterator](dataviewrowiterator.md)*

___

###  getMetadata

▸ **getMetadata**(): *[Promise](observable.md#promise)‹[DataViewMetadata](dataviewmetadata.md) | null›*

Defined in build/spotfire-api/spotfire-api.d.ts:181

Returns metadata about the data view.
Returns null if the dataview is invalid.

**Returns:** *[Promise](observable.md#promise)‹[DataViewMetadata](dataviewmetadata.md) | null›*

___

###  isValid

▸ **isValid**(): *[Promise](observable.md#promise)‹boolean›*

Defined in build/spotfire-api/spotfire-api.d.ts:172

Gets a value indicating if the dataView is valid.
When valid, the contents of the dataView can be accessed
using getAllRows or getIterator.
When not valid, use getError to get a description of the issue.

**Returns:** *[Promise](observable.md#promise)‹boolean›*

___

###  mark

▸ **mark**(`rows?`: [DataViewRow](dataviewrow.md)[]): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:161

Mark a set of rows.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`rows?` | [DataViewRow](dataviewrow.md)[] | The rows to be selected.  |

**Returns:** *void*
