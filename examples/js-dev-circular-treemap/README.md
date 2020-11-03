# Circular Treemap
This mod example is a simple circular treemap implemented with [d3](https://d3js.org/). It shows how hierarchies in mod data views can be mapped to d3 hierarchies.

It also illustrates some basic concepts, such as using a color axis, and implementing simple marking and tooltips.

All source code for the mod example can be found in the `src` folder.

## Prerequisites
These instructions assume that you have [Node.js](https://nodejs.org/en/) (which includes npm) installed.

## How to get started (with development server)
- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run server`. This will start a development server.
- Start editing, for example `src/circular-treemap.js`.
- In Spotfire, follow the steps of creating a new mod and connecting to the development server.

## Working without a development server
- In Spotfire, follow the steps of creating a new mod and then browse for, and point to, the _manifest_ in the `src` folder.
