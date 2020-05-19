---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 1
description: >
  The following guide will describe the steps needed to get a mod running in development mode inside Spotfire.
---

### 1. Creating an empty mod visualization in Spotfire
Open an analysis in Spotfire and then go to Tools > Create visualization mod. This will create an empty mod with a link to the example projects and a button to open the mod developer settings.

Continue by downloading the mod examples zip archive. The archive is available on the empty page or from the mod developer settings menu.

### 2. Pick a mod example
The mod-examples.zip files contains a set of examples using the mod API in various ways. They can be used as a starting point when developing a new mod. Examples in the javascript-examples folder are written in JavaScript and the examples in the typescript-examples folder are written in TypeScript. The TypeScript examples include build tools to generate minified JavaScript.

Extract the zip archive and open one of the example projects, e.g "javascript-examples/mod-example" in VS Code.

### 3. Start local development server
Start the mod example by starting the build task in VS Code. This will install necessary development dependencies and start a local web server (the task is defined in the vscode settings folder). The task should launch a url in your browser to the mod manifest.

<img src="run-task.png"></img>

### 4. Connect development server to Spotfire mod visualization
Switch over to Spotfire and open the mod developer settings. Click on the "Use development server", make sure that the displayed url matches the url opened in your browser, and thereafter click on the "Connect" button. This will make Spotfire navigate to your local server and serve files from your src folder.

<img src="connect-server.gif"></img>

If a visualization appears, it means that Spotfire has successfully connected to the development server. Now switch over to VS Code to start editing the mod implementation.

The src folder includes HTML, CSS and JavaScript files that together form the mod implementation. It also contains a manifest.json file that contains metadata about the mod. If any .html/css/js file in the src folder is changed while the development server is running, the mod will be reloaded in Spotfire.

As an example, open the main.css file and try to change the background property of body. As soon as the css file is saved, the change will appear in Spotfire.