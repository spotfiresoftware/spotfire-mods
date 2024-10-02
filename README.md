# Spotfire® Mods

Welcome to the public repository for Spotfire® Mods.

The Spotfire Mods framework makes it quick and easy to extend Spotfire® with custom visualizations and actions tailored for specific domains and use cases.

With a Spotfire visualization mod, you can  include custom visualizations in your Spotfire® applications much faster by integrating JavaScript visualizations. Create your own visualizations that look and feel like the native Spotfire visualizations, and that leverage the built-in capabilities of Spotfire.

A Spotfire action mod is a collection of actions (scripts) that are packaged together. Actions within a mod can be added to various controls and triggers in visualizations, as well as text areas as part of an analytic application, or they can be run ad hoc directly from the Actions flyout or from the Spotfire library.

## To get started

Creating a new Spotfire mod template is easily done user our [mods SDK](https://www.npmjs.com/package/@spotfire/mods-sdk). Just create a blank folder, run `npx @spotfire/mods-sdk new action` or `npx @spotfire/mods-sdk new visualization` and follow the instruction. 

[Spotfire mods SDK](https://www.npmjs.com/package/@spotfire/mods-sdk)

[Working with Spotfire® Mods](https://spotfiresoftware.github.io/spotfire-mods/docs/)

[Latest version of example projects](https://github.com/spotfiresoftware/spotfire-mods/releases/latest)

## Updating an existing mod project to a newer, or older, API version

The SDK always creates a mod project using the latest API version. When distributing a mod you may however want to consider downgrading to the lowest API version that supports the features needed in order to be backward compatible to older Spotfire versions. Up or downgrading API version is easily done by just changing the API version in the mod manifest file. It is however wise to also fetch the corresponding version of the [mods API](https://www.npmjs.com/package/@spotfire/mods-api), for example `npm add --save-dev @spotfire/mods-api@1.2` in order to get accurate type checking.

For projects created without the SDK, follow the instructions [here](https://www.npmjs.com/package/@spotfire/mods-api?activeTab=readme) to adapt your project to using the [API npm package](https://www.npmjs.com/package/@spotfire/mods-api).

The declaration file contains all new API features and each feature is documented with a @version attribute.

## Spotfire versions and their Mod API

The Mods API is backwards compatible but not forwards compatible. Pick a Mod API version that matches the lowest targeted Spotfire version.

| Spotfire version | Mod API version | Mod types              |
|------------------|-----------------|------------------------|
| Spotfire 11.0    | 1.0             | Visualization          |
| Spotfire 11.3    | 1.1             | Visualization          |
| Spotfire 11.4    | 1.2             | Visualization          |
| Spotfire 11.5    | 1.3             | Visualization          |
| Spotfire 14.4    | 2.0             | Action & Visualization |

A mod that uses features not available in the specified API version will fail at runtime. The details in the error message differs depending on the visualization type and whether the Spotfire instance is connected to a development server.

When a Spotfire analysis file with embedded mods is saved in its compatibility file format, mods with a higher version than the supported version will be removed. A visualization mod added to a page in the analysis will be replaced by a text area with information about the minimum Spotfire version required to view the mod.

## License

Licensed under the [3-Clause BSD](https://github.com/spotfiresoftware/spotfire-mods/blob/master/LICENSE) License.
