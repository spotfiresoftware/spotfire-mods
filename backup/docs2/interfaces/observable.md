["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [Observable](observable.md)

# Interface: Observable <**T**>

Represents a value in the Mod API that can be accessed and/or modified.

## Type parameters

▪ **T**

## Hierarchy

* [Promise](observable.md#promise)‹T›

  ↳ **Observable**

## Index

### Properties

* [Promise](observable.md#promise)
* [[Symbol.toStringTag]](observable.md#[symbol.tostringtag])
* [__futureValue](observable.md#optional-__futurevalue)
* [observerID](observable.md#observerid)

### Methods

* [catch](observable.md#catch)
* [finally](observable.md#finally)
* [then](observable.md#then)

## Properties

###  Promise

• **Promise**: *PromiseConstructor*

Defined in src/Web.Forms/node_modules/typedoc/node_modules/typescript/lib/lib.es2015.promise.d.ts:152

___

###  [Symbol.toStringTag]

• **[Symbol.toStringTag]**: *string*

*Inherited from [Observable](observable.md).[[Symbol.toStringTag]](observable.md#[symbol.tostringtag])*

Defined in src/Web.Forms/node_modules/typedoc/node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:169

___

### `Optional` __futureValue

• **__futureValue**? : *T*

Defined in build/spotfire-api/spotfire-api.d.ts:462

Used internally by the Mod api.

___

###  observerID

• **observerID**: *string*

Defined in build/spotfire-api/spotfire-api.d.ts:458

Used internally by the Mod api.

## Methods

###  catch

▸ **catch**<**TResult**>(`onrejected?`: function | undefined | null): *[Promise](observable.md#promise)‹T | TResult›*

*Inherited from [Observable](observable.md).[catch](observable.md#catch)*

Defined in src/Web.Forms/node_modules/typedoc/node_modules/typescript/lib/lib.es5.d.ts:1430

Attaches a callback for only the rejection of the Promise.

**Type parameters:**

▪ **TResult**

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`onrejected?` | function &#124; undefined &#124; null | The callback to execute when the Promise is rejected. |

**Returns:** *[Promise](observable.md#promise)‹T | TResult›*

A Promise for the completion of the callback.

___

###  finally

▸ **finally**(`onfinally?`: function | undefined | null): *[Promise](observable.md#promise)‹T›*

*Inherited from [Observable](observable.md).[finally](observable.md#finally)*

Defined in src/Web.Forms/node_modules/typedoc/node_modules/typescript/lib/lib.es2018.promise.d.ts:31

Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
resolved value cannot be modified from the callback.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`onfinally?` | function &#124; undefined &#124; null | The callback to execute when the Promise is settled (fulfilled or rejected). |

**Returns:** *[Promise](observable.md#promise)‹T›*

A Promise for the completion of the callback.

___

###  then

▸ **then**<**TResult1**, **TResult2**>(`onfulfilled?`: function | undefined | null, `onrejected?`: function | undefined | null): *[Promise](observable.md#promise)‹TResult1 | TResult2›*

*Inherited from [Observable](observable.md).[then](observable.md#then)*

Defined in src/Web.Forms/node_modules/typedoc/node_modules/typescript/lib/lib.es5.d.ts:1423

Attaches callbacks for the resolution and/or rejection of the Promise.

**Type parameters:**

▪ **TResult1**

▪ **TResult2**

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`onfulfilled?` | function &#124; undefined &#124; null | The callback to execute when the Promise is resolved. |
`onrejected?` | function &#124; undefined &#124; null | The callback to execute when the Promise is rejected. |

**Returns:** *[Promise](observable.md#promise)‹TResult1 | TResult2›*

A Promise for the completion of which ever callback is executed.
