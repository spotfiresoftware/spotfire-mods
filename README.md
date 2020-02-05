# Spotfire mods

Mods is a framework to create interactive visualizations in TIBCO Spotfire. Mods are based on web technologies and run in a sandboxed iframe.

![][area-chart-mod-example]

## Developing a mod

To develop and test a mod you need a running instance of Spotfire. Development can be done against the Windows client or the Web client.

### Prerequisites

While a mod does not strictly depend on any external tools to work, there are a few tools that are highly recommended to make the development workflow smooth. It is highly recommended to use [Visual Studio Code](https://code.visualstudio.com/) when developing a mod. The mod example include predefined settings for VS Code that enable a default build task, intellisense in the mod manifest and intellisense in the JavaScript code.

To enable live updates when developing a mod, a set of tools based on [Node.js](https://nodejs.org/en/download/) are needed. The mod example specifies a set of development dependencies in its package.json file. These are installed when executing `npm install` in the same directory as the package.json file. The install script is also executed as part of the default build task in VS Code.

### Getting started

The following guide will describe the steps needed to get a mod running in development mode inside Spotfire.

#### 1. Creating an empty mod visualization in Spotfire

Open an analysis in Spotfire and then go to _Tools > Create visualization mod_. This will create an empty mod with a link to the example projects and a button to open the mod developer settings.

Continue by downloading the mod examples zip archive. The archive is available on the empty page or from the mod developer settings menu.

#### 2. Pick a mod example

The mod-examples.zip files contains a set of examples using the mod API in various ways. They can be used as a starting point when developing a new mod. Examples in the javascript-examples folder are written in JavaScript and the examples in the typescript-examples folder are written in TypeScript. The TypeScript examples include build tools to generate minified JavaScript.

Extract the zip archive and open one of the example projects, e.g "javascript-examples/mod-example" in VS Code.

#### 3. Start local development server

Start the mod example by starting the build task in VS Code. This will install necessary development dependencies and start a local web server (the task is defined in the vscode settings folder). The task should launch a url in your browser to the mod manifest.

![][run-build-task]

#### 4. Connect development server to Spotfire mod visualization

Switch over to Spotfire and open the mod developer settings. Click on the "Use development server", make sure that the displayed url matches the url opened in your browser, and thereafter click on the "Connect" button. This will make Spotfire navigate to your local server and serve files from your src folder.

![][connect-to-development-server]

If a visualization appears, it means that Spotfire has successfully connected to the development server. Now switch over to VS Code to start editing the mod implementation.

The src folder includes HTML, CSS and JavaScript files that together form the mod implementation. It also contains a manifest.json file that contains metadata about the mod. If any .html/css/js file in the src folder is changed while the development server is running, the mod will be reloaded in Spotfire.

As an example, open the main.css file and try to change the background property of body. As soon as the css file is saved, the change will appear in Spotfire.

## Mod example folder structure

The following files and folders are part of the example:
File | Description
--- | ---
src folder | Folder for the mod's source code.
.vscode folder | Settings for VS Code
spotfire folder | Files related to the mod API.
package.json | Lists the Node.js dependencies and necessary scripts
development-server.js | A node.js script that starts a development server.
prettier.config.js | Configuration file for formatting with the tool prettier.
tsconfig.json | TypeScript project file. It links the `/spotfire/spotfire-api.dts` file for intellisense in your code.

## Mod-manifest.json

All metadata that concerns the mod is defined in a file called mod-manifest.json. It is used to give the mod a name, an id, defining axes and their placement. It is also used to list all files used by the mod. Only files listed in the files property will be embedded by Spotfire.

In order for changes of the manifest to have an effect, the manifest needs to manually reloaded in Spotfire. It is done by clicking the Reload manifest button in mod developer settings.

## Debugging

The mod can be debugged via the developer tools in Spotfire. It's the same tools as Chrome uses. To access the developer tools use the following keyboard command:
In Spotfire Analyst: ctrl + alt + shift + f12
In Business Author: f12

To find the main.js file, use the Open file command (ctrl + P) and type the file's name. In the opened file it is possible to set breakpoints. It is also possible to execute code in the console.  
More information about Chrome developer tools can be found here: https://developers.google.com/web/tools/chrome-devtools

## Development in Spotfire Web Client

When a mod is developed in the Web client it is not possible to use the "Browse for files" feature. Web browsers lack the file access that is needed to read files from a mod-manifest. Therefore it is only possible to develop mods via a development server.

The required browser when developing mods against the Web client is Google Chrome. This is due to how browsers behave with regards to loading http content from a https context. The development server is serving files from http://127.0.0.1:8090, which according to the W3C specification is a [potentially trustworthy origin](https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin). Currently only Chrome behaves correctly with regards to this. Other browsers vendors are implementing support for this and might work in the future.

## Troubleshooting

If the live reload feature does not work when using the development server, try disable the network cache in the chrome developer tools. It is done in the network tab by checking the "Disable cache" checkbox.

## Embedding mod and publishing

When the development is done, the mod is saved into the analysis by toggling back to embedded mode from the mod developer settings.

### Sharing mod using the Spotfire library

It is possible to share a mod using the Spotfire library. In order to do so press the Publish button in the mod developer settings. Note that it is the embedded mod that it is saved to the library.

In the following dialog you get to choose where in the library to save the mod.

Once a mod has been saved to the library it is possible for others, connected to the same library, to add the mod to their visualization flyouts.

By navigating the content browser to the folder where you have saved the mod and single-click it you will get a notification that it has been added to the available visualizations.

Example of mods added to the visualization flyout above.

[area-chart-mod-example]: /images/area-chart.png "Area chart mod example"
[run-build-task]: /images/run-task.png "Run the default build task"
[connect-to-development-server]: /images/connect-server.gif "Connect to development server"
