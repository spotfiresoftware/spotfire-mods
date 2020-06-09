---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 1
description: >
  The following guide will describe the steps needed to get a mod running in development mode inside Spotfire.
---

## Developing a visualization mod

Mods is a framework to create interactive visualizations in TIBCO Spotfire. Mods are based on web technologies and run in a sandboxed iframe.

### Prerequisites
* **A running instance of Spotfire.** \
This is needed to develop and test a mod. Development can be done against the installed client (TIBCO Spotfire Analyst) or the web client (TIBCO Spotfire Business Author).

* **A code editor.**\
It is highly recommended to use [Visual Studio Code](https://code.visualstudio.com/) (VS Code) when developing a mod. The instructions in this document assume that VS Code is used as code editor. The mod example projects that are available for developers, include predefined settings for VS Code that enable a default build task, IntelliSense in the mod manifest, and IntelliSense in the JavaScript code.

* **Node.js installed.**\
To enable live updates when developing a mod, a set of tools based on [Node.js](https://nodejs.org/en/download/) are needed. The mod example specifies a set of development dependencies in its package.json file. These are installed when executing `npm install` in the same directory as the package.json file. The install script is also executed as part of the default build task in VS Code.

### Getting started

The following guide will describe the steps needed to get a mod running in development mode inside Spotfire.

#### 1. Create an empty visualization mod in Spotfire

Open Spotfire and load some data. Go to _Tools > Create visualization mod_. This will create an empty mod. 
![][empty-mod]

#### 2. Start from a mod example

Click _Download_ to access spotfire-mod-sdk.zip, where the mod example projects are provided. Extract the zip archive on your computer. The extracted spotfire-mod-sdk folder contains examples of mods using the mod API in different ways.

* **js-dev-barchart** \
To get familiar with mod development, start with this example containing a simple bar chart. This is the example that will be used in the following sections of this getting started guide.
* **js-dev-starter** \
This example can be used as a starting point for any new mod.
* **js-dev-barchart-googlecharts** \
This example is a basic bar chart that is built using the Google Charts library. The [tutorial](../../tutorials/barchart-googlechart/) covers the steps taken to create this bar chart from scratch.
* **ts-dev-gauge-googlecharts** \
This is an example of a gauge visualization that is developed in TypeScript using the Google Charts library and bundled with Rollup.
* **js-areachart-d3** \
This is a more complex example built using the D3 library, where you can see how the API can be used to take advantage of a lot of features in Spotfire.


Each example contains a README file with detailed instructions specific to the example.
To use the js-dev-barchart example, open the js-dev-barchart folder in the VS Code editor:
_File > Open Folder > spotfire-mod-sdk\Examples\js-dev-barchart_

#### 3. Start local development server

Start the mod example, select _Terminal > Run Build Task_. This will install necessary development dependencies and start a local web server (the task is defined in the .vscode settings folder). The task launches a URL in your browser to the mod manifest.

![][run-build-task]

#### 4. Connect Spotfire to the development server

Switch over to Spotfire and click the _Connect to project_ button. In the dialog that opens, click _Developer server_. Make sure the displayed URL matches the launched URL in your browser, and then click the _Connect_ button. This will make Spotfire navigate to your local server and serve files from your src folder.

![][connect-to-development-server]

If a visualization appears, it means that Spotfire has successfully connected to the development server. 

#### 5. Start editing your example

Now switch over to VS Code to start editing the mod implementation.

The src folder includes HTML, CSS and JavaScript files that together form the mod implementation. It also contains a mod-manifest.json file that contains metadata about the mod. If any .html/css/js file in the src folder is changed while the development server is running, the mod will be reloaded in Spotfire

As an example, open the main.css file and try to change the background property of body. As soon as the css file is saved, the change will appear in Spotfire.

For information about how the Spotfire Mod API is accessed, open the main.js file.

## Mod example folder structure

The following files and folders are part of the example:

|File                  | Description |
|----------------------|-------------------------------------------------|
|.vscode               | Settings for VS Code. |
|spotfire              | Files related to the mod API. |
|src                   | Folder for the mod's source code. |
|development-server.js | A node.js script that starts a development server. |
|package.json          | Lists the Node.js dependencies and necessary scripts. |
|prettier.config.js    | Configuration file for formatting with the tool prettier. |
|README.md             | Instructions on how to get started. |
|tsconfig.json         | TypeScript project file. It links the `/spotfire/spotfire-api.dts` file for IntelliSense in your code. |

## The mod-manifest.json

All metadata that concerns the mod is defined in a file called mod-manifest.json. It is used to give the mod a name and an id, and to define axes and their placement. It is also used to list all files used by the mod. Only files listed in the ‘files’ property will be embedded by Spotfire.

For changes in the manifest to take effect, the manifest must be reloaded manually in Spotfire. Click the puzzle icon on the title bar of the visualization mod, and then click the _Reload manifest_ button in the dialog that opens.

## Debugging

The mod can be debugged via the Developer tools in Spotfire. These tools are the same as the tools used by Chrome. To access the Developer tools, use the following keyboard commands. 
In Spotfire Analyst: _Ctrl+Alt+Shift+F12_ 
In Business Author: _F12_


To find the main.js file, use the Open file command (Ctrl+P) and type the file's name. In the opened file, it is possible to set breakpoints. It is also possible to execute code in the console.
More information about Chrome DevTools can be found here:
 https://developers.google.com/web/tools/chrome-devtools

## Development in the Spotfire Web Client

The required browser when developing mods against the web client is Google Chrome. This is due to how browsers behave with regards to loading http content from a https context. The development server is serving files from http://127.0.0.1:8090, which according to the W3C specification is a [potentially trustworthy origin](https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin). Currently only Chrome behaves correctly with regards to this. Other browser vendors are implementing support for this and might work in the future.

Note also that when developing a mod in the web client, it is only possible to develop via a development server. Web browsers lack the file access that is needed to read files from a mod-manifest, which means that the _Browse_ button will not work in the web client.

## Embedding the mod and saving to the library

When the development is done, the mod is saved into the analysis by toggling back to embedded mode from the mod developer settings.
![][disconnect-and-embed]

### Saving the mod to the Spotfire library

When your mod has been embedded in the analysis, you can share the mod with others by saving it in the library.

1. Click the puzzle icon in the title bar to open the dialog.
2. Click _Save to library_.
3. In the dialog that opens, navigate to the folder where you want to save the mod, and click _Save_.
When the mod has been saved to the library, it is possible for others, connected to the same library, to use your mod in their analyses. The mod can also be pinned to the visualization flyout.

## FAQ

### Why doesn’t live reload work?
If the live reload feature does not work when using the development server, try disabling the network cache in the Chrome Developer tools.
Open Chrome developer tools (Ctrl+Shift+I) and go to the Network tab, then select the _Disable cache_ checkbox.

### How do I use types in JavaScript files?
Even though JavaScript lacks type support, it is possible to get a long way with the help of JSDoc comments. The TypeScript language service in Visual Studio Code can parse JSDoc type comments and provide IntelliSense when using the Spotfire mods API. The following snippet defines the variable `dataView` as an instance of `Spotfire.DataView`.
```javascript
/** @type {Spotfire.DataView} */
let dataView;
```
This can be useful in cases where the API allows generic types, such as a continuous value:
```javascript
/** @type {Spotfire.DataViewContinuousValue} */
let y = row.get("Y");
```
The same would have been done in TypeScript like this:
```typescript
let y = row.get<Spotfire.DataViewContinuousValue>("Y");
```

### Why don’t changes to the mod-manifest.json take effect in my analysis?
The manifest is used by Spotfire to generate the underlying model for the mod. The model is generated each time the manifest is read by Spotfire. Spotfire only reads the mod manifest when the developer server is connected, disconnected or when the _Reload manifest_ button is clicked.

When the developer server is in a connected state, Spotfire points the mod iframe's source directly against the developer server. Any UI changes seen while the server is connected is not stored in the Spotfire document. To save the current state of the mod in the document, reload the mod manifest manually.

**Solution:** Reload the manifest via the developer settings.


[empty-mod]: ./media/empty-mod.png "Empty mod."
[run-build-task]: ./media/run-task.png "Run the default build task"
[connect-to-development-server]: ./media/connect-to-development-server.gif "Connect to development server"
[disconnect-and-embed]: ./media/disconnect-and-embed.gif "Disconnect from development server to embed mod"
