["Spotfire mod API"](README.md) › [Globals](globals.md)

# "Spotfire mod API"

## Index

### Interfaces

* [Axis](interfaces/axis.md)
* [AxisPart](interfaces/axispart.md)
* [AxisValues](interfaces/axisvalues.md)
* [CheckboxOptions](interfaces/checkboxoptions.md)
* [Column](interfaces/column.md)
* [ColumnValues](interfaces/columnvalues.md)
* [ComponentEvent](interfaces/componentevent.md)
* [ContextMenuItem](interfaces/contextmenuitem.md)
* [Controls](interfaces/controls.md)
* [DataTable](interfaces/datatable.md)
* [DataTableValues](interfaces/datatablevalues.md)
* [DataView](interfaces/dataview.md)
* [DataViewDimensionValue](interfaces/dataviewdimensionvalue.md)
* [DataViewHierarchyNode](interfaces/dataviewhierarchynode.md)
* [DataViewMeasureValue](interfaces/dataviewmeasurevalue.md)
* [DataViewMetadata](interfaces/dataviewmetadata.md)
* [DataViewRow](interfaces/dataviewrow.md)
* [DataViewRowIterator](interfaces/dataviewrowiterator.md)
* [FontInfo](interfaces/fontinfo.md)
* [Mod](interfaces/mod.md)
* [ModVisualization](interfaces/modvisualization.md)
* [Observable](interfaces/observable.md)
* [Page](interfaces/page.md)
* [PageValues](interfaces/pagevalues.md)
* [PartialDataViewMethods](interfaces/partialdataviewmethods.md)
* [Plot](interfaces/plot.md)
* [Popout](interfaces/popout.md)
* [PopoutComponent](interfaces/popoutcomponent.md)
* [PopoutOptions](interfaces/popoutoptions.md)
* [Progress](interfaces/progress.md)
* [Property](interfaces/property.md)
* [PropertyValue](interfaces/propertyvalue.md)
* [RadioButtonOptions](interfaces/radiobuttonoptions.md)
* [ReadFunction](interfaces/readfunction.md)
* [RenderContext](interfaces/rendercontext.md)
* [Size](interfaces/size.md)
* [SpotfireDocument](interfaces/spotfiredocument.md)
* [StylingInfo](interfaces/stylinginfo.md)
* [Tooltip](interfaces/tooltip.md)

### Type aliases

* [DataViewRowIteratorResult](globals.md#dataviewrowiteratorresult)
* [ExtractValueType](globals.md#extractvaluetype)
* [MarkingOperation](globals.md#markingoperation)
* [MethodKeys](globals.md#methodkeys)
* [OnLoadCallback](globals.md#onloadcallback)
* [Partial](globals.md#partial)
* [PartialDataView](globals.md#partialdataview)
* [PropertyDataType](globals.md#propertydatatype)

### Functions

* [initialize](globals.md#initialize)

## Type aliases

###  DataViewRowIteratorResult

Ƭ **DataViewRowIteratorResult**: *object | object*

Defined in build/spotfire-api/spotfire-api.d.ts:289

___

###  ExtractValueType

Ƭ **ExtractValueType**: *object*

Defined in build/spotfire-api/spotfire-api.d.ts:301

From observableArray, an array of Observable of some value type, extract an array of this value type.

#### Type declaration:

___

###  MarkingOperation

Ƭ **MarkingOperation**: *"Replace" | "Add" | "Subtract" | "Toggle" | "Intersect"*

Defined in build/spotfire-api/spotfire-api.d.ts:332

___

###  MethodKeys

Ƭ **MethodKeys**: *object[keyof T]*

Defined in build/spotfire-api/spotfire-api.d.ts:338

Extract from T the keys of all properties with function values.

___

###  OnLoadCallback

Ƭ **OnLoadCallback**: *function*

Defined in build/spotfire-api/spotfire-api.d.ts:468

#### Type declaration:

▸ (`mod`: [Mod](interfaces/mod.md)): *void | [Promise](interfaces/observable.md#promise)‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`mod` | [Mod](interfaces/mod.md) |

___

###  Partial

Ƭ **Partial**: *[Observable](interfaces/observable.md)‹Node› & Pick‹Node, [MethodKeys](globals.md#methodkeys)‹Node››*

Defined in build/spotfire-api/spotfire-api.d.ts:491

A partial has all methods of the Node but no data values. It can be used in the same was as an Observable.
A full node will be created by waiting for the promise of by reading the node.

___

###  PartialDataView

Ƭ **PartialDataView**: *[PartialDataViewMethods](interfaces/partialdataviewmethods.md) & [Observable](interfaces/observable.md)‹[DataView](interfaces/dataview.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:496

___

###  PropertyDataType

Ƭ **PropertyDataType**: *string | number | boolean*

Defined in build/spotfire-api/spotfire-api.d.ts:576

The data types possible to store in a property.

## Functions

###  initialize

▸ **initialize**(`onLoaded`: [OnLoadCallback](globals.md#onloadcallback)): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:327

Initialize the Mod API.

**`example`** 
```
Spotfire.initialize(async (api) => {
 console.log("Mod API loaded.");
});
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`onLoaded` | [OnLoadCallback](globals.md#onloadcallback) | Callback when the mod API is initialized and ready to be interacted with.  |

**Returns:** *void*
