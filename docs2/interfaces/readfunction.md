["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [ReadFunction](readfunction.md)

# Interface: ReadFunction <**T**>

A read function is created from the api.reader. It is a function that can read new values from observables passed to api.reader.

## Type parameters

▪ **T**: *ReadonlyArray‹any›*

## Hierarchy

* **ReadFunction**

## Callable

▸ (`callback`: function, `errorCallback?`: undefined | function): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:604

Read content and the callback will be invoked when all values have been resolved. At least one new value will be read.

**Parameters:**

▪ **callback**: *function*

▸ (...`values`: T): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...values` | T |

▪`Optional`  **errorCallback**: *undefined | function*

**Returns:** *void*

▸ (): *[Promise](observable.md#promise)‹T›*

Defined in build/spotfire-api/spotfire-api.d.ts:606

Read all values and retrieve them as a promise.

**Returns:** *[Promise](observable.md#promise)‹T›*
