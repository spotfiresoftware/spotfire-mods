# Spider chart

![Spider chart example](SpiderChartModExample.png)

This is a mod example demonstrating a spider chart written in `TypeScript` and rendered with `d3` using the mods SDK.

All source code for the mod example can be found in the `src` folder. Other necessary files reside in the root folder. Read below for further explanation.

## Prerequisites

These instructions assume that you have [Node.js](https://nodejs.org/en/) (which includes npm) installed.

## How to get started (with development server)

- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run build:dev`. This will compile TypeScript to JavaScript and place the bundle in the `build` folder. This task will watch for changes in code and will continue running until it is stopped. Whenever you save a file, the changes will be reflected in the visualization mod.
- Run `npm run server` in a separate terminal. This will start a development server.
- Start editing, for example `src/main.ts`.
- In Spotfire, follow the steps of creating a new mod and connecting to the development server.

## Working without a development server

- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run build`. This will bundle the JavaScript and place it in the `build` folder. This task will not watch for changes in code.
- In Spotfire, follow the steps of creating a new mod and then browse for, and point to, the _manifest_ in the root folder.
