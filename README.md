# Spotfire Mods by TIBCO Spotfire®

Welcome to the public repository for Spotfire® Mods.

With Spotfire Mods, you can include custom visualizations in your Spotfire® applications much faster by integrating JavaScript visualizations. Create your own visualizations that look and feel like the native Spotfire visualizations, and that leverage the built-in capabilities of Spotfire.

## To get started

[Introduction and tutorials](https://tibcosoftware.github.io/spotfire-mods/docs/)

[Latest version of example projects](https://github.com/TIBCOSoftware/spotfire-mods/releases/latest)

## Updating an existing mod project to a newer API version

The mod examples are starting points for your own mod project. The following steps describe how to update an older mod to a newer API version:

- Copy new versions of the [`spotfire-api-X-X.d.ts`](https://github.com/TIBCOSoftware/spotfire-mods/tree/master/examples/js-dev-barchart/spotfire) and `mod-schema.json` files into the `spotfire` folder in your mod project, and remove the older ones.
- Update the [`apiVersion`](https://github.com/TIBCOSoftware/spotfire-mods/blob/7be343f007d2ec9f3d36e5078419b57674db8467/examples/js-dev-barchart/src/mod-manifest.json#L2) property in your `mod-manifest.json` file to the version you want to use.
- In TypeScript projects you might need to update the [`paths`](https://github.com/TIBCOSoftware/spotfire-mods/blob/7be343f007d2ec9f3d36e5078419b57674db8467/examples/ts-spiderchart-d3/tsconfig.json#L17) property in the `tsconfig.json` file with the correct version.

The declaration file contains all new API features and each feature is documented with a @version attribute.

## Spotfire versions and their Mod API

The Mods API is backwards compatible but not forwards compatible. Pick a Mod API version that matches your target Spotfire version.

| Spotfire version | Mod API version |
|------------------|-----------------|
| Spotfire 11.0    | 1.0             |
| Spotfire 11.3    | 1.1             |
| Spotfire 11.4    | 1.2             |

When a mod is trying to use newer API features without updating the [`apiVersion`](https://github.com/TIBCOSoftware/spotfire-mods/blob/7be343f007d2ec9f3d36e5078419b57674db8467/examples/js-dev-barchart/src/mod-manifest.json#L2) in the `mod-manifest.json` the following happens.

- Newer Properties are omitted in the Spotfire runtime. E.g this means that a 1.1 mod will never see an `isEditing` property on a RenderContext object.
- Newer functions are available but throw a runtime error when invoked. The error message states the required API version to invoke the function without errors.

When a Spotfire analysis file with embedded mods is saved in its compatibility file format, the mod is replaced with a text area if the mod or its API version is not supported in the compatibility version.

## License

Licensed under the [3-Clause BSD](https://github.com/TIBCOSoftware/spotfire-mods/blob/master/LICENSE) License.
