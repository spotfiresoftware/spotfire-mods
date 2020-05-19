["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [PopoutOptions](popoutoptions.md)

# Interface: PopoutOptions

## Hierarchy

* **PopoutOptions**

## Index

### Properties

* [alignment](popoutoptions.md#optional-alignment)
* [autoClose](popoutoptions.md#autoclose)
* [x](popoutoptions.md#x)
* [y](popoutoptions.md#y)

### Methods

* [onChange](popoutoptions.md#onchange)

## Properties

### `Optional` alignment

• **alignment**? : *"Left" | "Right" | "Top" | "Bottom"*

Defined in build/spotfire-api/spotfire-api.d.ts:549

Position of the popout in relation to the passed coordinates.

___

###  autoClose

• **autoClose**: *boolean*

Defined in build/spotfire-api/spotfire-api.d.ts:551

Automatically close the popout when a control is clicked.

___

###  x

• **x**: *number*

Defined in build/spotfire-api/spotfire-api.d.ts:545

Horizontal pixel coordinate of the Popout.

___

###  y

• **y**: *number*

Defined in build/spotfire-api/spotfire-api.d.ts:547

Vertical pixel coordinate of the Popout.

## Methods

###  onChange

▸ **onChange**(`event`: [ComponentEvent](componentevent.md)): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:553

Callback invoked when a component is invoked in the Popout.

**Parameters:**

Name | Type |
------ | ------ |
`event` | [ComponentEvent](componentevent.md) |

**Returns:** *void*
