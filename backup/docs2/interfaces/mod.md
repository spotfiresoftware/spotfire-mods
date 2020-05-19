["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [Mod](mod.md)

# Interface: Mod

The Mod API exposes methods for interacting with Spotfire.

Reading content from the Mod is done with a [reader](mod.html#reader).

## Hierarchy

* **Mod**

## Index

### Properties

* [controls](mod.md#controls)
* [document](mod.md#document)
* [mod](mod.md#mod)
* [plot](mod.md#plot)

### Methods

* [getRenderContext](mod.md#getrendercontext)
* [onError](mod.md#onerror)
* [reader](mod.md#reader)
* [transaction](mod.md#transaction)

## Properties

###  controls

• **controls**: *[Controls](controls.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:405

Methods for showing controls, for example a Spotfire context menu.

___

###  document

• **document**: *[SpotfireDocument](spotfiredocument.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:352

The Spotfire document.

___

###  mod

• **mod**: *[ModVisualization](modvisualization.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:356

All types of content in the mod that can be read and/or modified by the mod API. Observables can be used as parameters to the `api.reader` method in order to read the content.

___

###  plot

• **plot**: *[Plot](plot.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:403

Static methods for interacting with a data view.

## Methods

###  getRenderContext

▸ **getRenderContext**(): *[RenderContext](rendercontext.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:430

Get the mod's render context. This function should be invoked as soon as possible in the initialize callback.
If `getRenderContext` is not called in the `initialize` callback, the mod will be automatically exported after one second.

**Returns:** *[RenderContext](rendercontext.md)*

___

###  onError

▸ **onError**(`errorCallback`: function): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:425

General error handler.

**Parameters:**

▪ **errorCallback**: *function*

callback that will be invoked each time an error occur.

▸ (`messageCallback`: string): *void*

**Parameters:**

Name | Type |
------ | ------ |
`messageCallback` | string |

**Returns:** *void*

___

###  reader

▸ **reader**<**T**>(...`observables`: T): *[ReadFunction](readfunction.md)‹[ExtractValueType](../globals.md#extractvaluetype)‹T››*

Defined in build/spotfire-api/spotfire-api.d.ts:401

Read content for the mod. All content names will be converted into values in the callback.
The reader method will return a [ReadFunction](readfunction.html) that can be used to read content values.

**`example`** Read the dataView once with a callback.
```
let read = api.reader(api.mod.data());
read((dataView) => {
   console.log(dataView.getRowCount());
});
```

**`example`** Read the dataView each time it changes.
```
let read = api.reader(api.mod.data());
read(function onChange(dataView) {
   console.log(dataView.getRowCount());
   read(onChange);
});
```

**`example`** Read the dataView and property X each time any of them changes.
```
let read = api.reader(api.mod.data(), api.mod.property("X"));
read(async function onChange(dataView, xValue) {
   let allRows = await mod.plot.getAllRows(dataView);
   console.log(dataView.getRowCount());
   console.log(xValue);
   read(onChange);
});
```

**`example`** The read function returns a promise with the values if no callback is passed.
```
// The following needs to be done in an async function.
let read = api.reader(api.mod.data(), api.mod.property("X"));
while(true) {
   let [dataView, x] = await read(); // Only resolves when a value has changed.
   console.log(dataView.getRowCount());
   console.log(xValue);
}
```

**Type parameters:**

▪ **T**: *ReadonlyArray‹[Observable](observable.md)›*

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`...observables` | T | A list of requested content. Observables are found in api.document and api.mod |

**Returns:** *[ReadFunction](readfunction.md)‹[ExtractValueType](../globals.md#extractvaluetype)‹T››*

- function used to read content.

___

###  transaction

▸ **transaction**(`action`: function): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:420

Perform a set of synchronous modifications in an explicit transaction.
The transaction method is only needed if you want to be sure that a set of modifications are done as one transaction (one undo step).
Modifications done outside of a transaction action callback will be grouped together in an implicit transaction.

**`example`** 
```
api.transaction(() => {
    api.mod.property("X").set("new value for X");
    api.mod.property("Y").set("new value for Y");
});
```

**Parameters:**

▪ **action**: *function*

callback with a set of modifications

▸ (): *void*

**Returns:** *void*
