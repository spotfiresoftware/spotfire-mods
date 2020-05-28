# Simple Bar Chart 
This mod example demonstrates a simplified bar chart using plain JavaScript. 

The example is simplified in the sense that it does not handle all configurations of axes and their expressions gracefully. Depending on the data used, there are edge-cases when the visualization renders poorly and even incorrectly. For instance, when there are more bars than what can fit on the screen. 

The purpose of this example is to illustrate, with commented and understandable code, how to construct a well-known visualization using the Mod API. 

## How to get started

### Prerequisites
These instructions assume that you have [Node.js](https://nodejs.org/en/) (which includes npm) installed.

### Start the development web server
Open a terminal, like powershell, in this folder, that is, where this README file is located. If you are using Visual Studio Code and have opened this folder you can use the terminal feature in VS Code. In this terminal execute `npm start`. This will install some modules and then start a web server that Spotfire can connect to during development of your Mod. A browser tab will be opened and navigated to this web server showing the `src/mod-manifest.json` file that declares the Mod contents and features to Spotfire.

### Connect Spotfire to the Mod project
In Spotfire, start by loading some simple data. Then create a new empty Mod visualization using _Tools -> Create visualization mod_ then press _Connect to project_ and in the developer tool that shows, press _Developer server..._.

The Mod visualization now shows a bar chart defined and implemented by the files in the `src` folder.

### Explore the code
All code that constitute the bar chart is located in the `src` folder. Spotfire has read the `mod-manifest.json` and all files that it specifies. Try changing something in `main.css` in your editor. When you save the file the changes will be reflected in the Mod Visualization.

All code that uses the Mod API and renders the bar chart is located in `main.js`.

