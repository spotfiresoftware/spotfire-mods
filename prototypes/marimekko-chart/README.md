# Bar Chart 
This mod example demonstrates a simplified bar chart using plain JavaScript. 

The example is simplified in the sense that it does not handle all configurations of axes and their expressions gracefully. Depending on the data used, there are edge-cases when the visualization renders poorly and even incorrectly, for instance, when there are more bars than can fit on the screen. 

The purpose of this example is to illustrate, with commented and understandable code, how to construct a well-known visualization using the mod API. 

All source code for the mod example can be found in the `src` folder.

## Prerequisites
These instructions assume that you have [Node.js](https://nodejs.org/en/) (which includes npm) installed.

## How to get started (with development server)
- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run server`. This will start a development server.
- Start editing, for example `src/index.js`.
- In Spotfire, follow the steps of creating a new mod and connecting to the development server.

## Working without a development server
- In Spotfire, follow the steps of creating a new mod and then browse for, and point to, the _manifest_ in the `src` folder.