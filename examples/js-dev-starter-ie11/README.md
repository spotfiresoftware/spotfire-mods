# Mod starter project (with IE11 support)
This is a mod template project. It contains the minimum amount of code necessary to run a working mod in all major browsers (including IE11). It's bundled with `Webpack` and transpiled with `Babel`.

All source code for the mod example can be found in the `src` folder. Other necessary files reside in the `static` folder. Read below for further explanation.

## Prerequisites
These instructions assume that you have [Node.js](https://nodejs.org/en/) (which includes npm) installed.

## How to get started (with development server)
- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm start`. This will bundle the JavaScript and place it in the `dist` folder. This task will watch for changes in code and will continue running until it is stopped. Whenever you save a file the changes will be reflected in the Mod Visualization.
- Run `npm run server` in a separate terminal. This will start a development server.
- Start editing, e.g `src/main.js`
- In Spotfire, follow the steps of creating a new mod and connecting to development server.

## Working without a development server
- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run build`. This will bundle the JavaScript and place it in the `dist` folder. It also copies the contents of `static` into `dist`. This task will not watch for changes in code.
- In Spotfire, follow the steps of creating a new mod and then browse for, and point to, the _manifest_ in the `dist` folder.