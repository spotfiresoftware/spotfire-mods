["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [Controls](controls.md)

# Interface: Controls

Spotfire UI components.

## Hierarchy

* **Controls**

## Index

### Properties

* [popout](controls.md#popout)
* [progress](controls.md#progress)
* [tooltip](controls.md#tooltip)

### Methods

* [showAxisSelector](controls.md#showaxisselector)
* [showContextMenu](controls.md#showcontextmenu)

## Properties

###  popout

• **popout**: *object*

Defined in build/spotfire-api/spotfire-api.d.ts:86

#### Type declaration:

* **components**(): *object*

  * **button**(`text`: string, `id`: string): *[PopoutComponent](popoutcomponent.md)*

  * **checkboxButton**(`settings`: [CheckboxOptions](checkboxoptions.md)): *[PopoutComponent](popoutcomponent.md)*

  * **divider**(): *[PopoutComponent](popoutcomponent.md)*

  * **heading**(`text`: string): *[PopoutComponent](popoutcomponent.md)*

  * **radioButton**(`settings`: [RadioButtonOptions](radiobuttonoptions.md)): *[PopoutComponent](popoutcomponent.md)*

  * **row**(`singleLine`: boolean, `children`: [PopoutComponent](popoutcomponent.md)[]): *[PopoutComponent](popoutcomponent.md)*

* **show**(`args`: [PopoutOptions](popoutoptions.md), `controls`: function): *[Popout](popout.md)*

___

###  progress

• **progress**: *[Progress](progress.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:85

___

###  tooltip

• **tooltip**: *[Tooltip](tooltip.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:84

## Methods

###  showAxisSelector

▸ **showAxisSelector**(`name`: string, `x`: number, `y`: number): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:83

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`x` | number |
`y` | number |

**Returns:** *void*

___

###  showContextMenu

▸ **showContextMenu**(`x`: number, `y`: number, `items`: [ContextMenuItem](contextmenuitem.md)[]): *[Promise](observable.md#promise)‹[ContextMenuItem](contextmenuitem.md)›*

Defined in build/spotfire-api/spotfire-api.d.ts:82

**Parameters:**

Name | Type |
------ | ------ |
`x` | number |
`y` | number |
`items` | [ContextMenuItem](contextmenuitem.md)[] |

**Returns:** *[Promise](observable.md#promise)‹[ContextMenuItem](contextmenuitem.md)›*
