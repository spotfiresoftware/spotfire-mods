["Spotfire mod API"](../README.md) › [Globals](../globals.md) › [RenderContext](rendercontext.md)

# Interface: RenderContext

The render context contains information needed when rendering a mod, either in the UI or as part of an export.

## Hierarchy

* **RenderContext**

## Index

### Properties

* [imagePixelRatio](rendercontext.md#imagepixelratio)
* [interactive](rendercontext.md#interactive)
* [styling](rendercontext.md#styling)

### Methods

* [signalRenderComplete](rendercontext.md#signalrendercomplete)

## Properties

###  imagePixelRatio

• **imagePixelRatio**: *number*

Defined in build/spotfire-api/spotfire-api.d.ts:624

The image pixel ratio is needed when the mod is rendering a rasterized image/canvas.

___

###  interactive

• **interactive**: *boolean*

Defined in build/spotfire-api/spotfire-api.d.ts:620

A mod is not interactive when it is exported.
This property can e.g. be used to hide controls in an export context.

___

###  styling

• **styling**: *[StylingInfo](stylinginfo.md)*

Defined in build/spotfire-api/spotfire-api.d.ts:626

Contains information about the currently used theme

## Methods

###  signalRenderComplete

▸ **signalRenderComplete**(): *void*

Defined in build/spotfire-api/spotfire-api.d.ts:632

Signal that the mod is ready to be exported.
If this method is not called, Spotfire will render your export/preview without knowing if it is done.
The default maximum allowed time for a mod to finish rendering is 20 seconds.

**Returns:** *void*
