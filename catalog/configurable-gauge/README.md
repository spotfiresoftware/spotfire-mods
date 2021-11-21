# Gauge mod

This is a mod example demonstrating a gauge written in [`TypeScript`](https://www.typescriptlang.org/), rendered with [`d3`](https://d3js.org/) and bundled with [`esbuild`](https://esbuild.github.io/).

All source code for the mod example can be found in the `src` folder. Other necessary files reside in the `static` folder. Tests reside in the `tests` folder. Read below for further explanation.

## Configurable settings

- Arc width.
- Min and Max values via continuous axes.
- Start and end angle.
- Opacity of background arc.
- Opacity of scale ticks.
- Show gauge value as percent
- Shake overfull gauge.
- Show min and max labels.

## Development Prerequisites

These instructions assume that you have [Node.js](https://nodejs.org/en/) (which includes npm) installed.

## How to get started (with development server)

- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run the default build task (CTRL + SHIFT + B) from inside VS Code. This will automatically start all necessary processes and the following steps can be omitted.

### Manual steps when build task is not used

- Run `npm start`. This will compile TypeScript to JavaScript and place the bundle in the `dist` folder. This task will watch for changes in code and will continue running until it is stopped. Whenever you save a file, the changes will be reflected in the visualization mod.
- Run `npm run server` in a separate terminal. This will start a development server.
- Run `npm run ts-watch` in a separate terminal. This will start TypeScript compiler to see all type errors.
- Start editing, for example `src/main.ts`.
- In Spotfire, follow the steps of creating a new mod and connecting to the development server.

## Working without a development server

- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run build`. This will bundle the JavaScript and place it in the `dist` folder. It also copies the contents of `static` into `dist`. This task will not watch for changes in code.
- In Spotfire, follow the steps of creating a new mod and then browse for, and point to, the _manifest_ in the `dist` folder.

## Bundle for production

The default build task will create an uncompressed JavaScript bundle to simplify development and debugging. When the mod is ready to be saved into the analysis file the JavaScript bundle should be compressed. By invoking `npm run build`, `esbuild` will create a minified bundle.

## Unit tests

Invoking `npm test` will start a test runner with a file watcher.

The mod uses the [Jasmine test library](https://jasmine.github.io/) for unit tests. Tests are executed by the [Karma test runner](https://www.npmjs.com/package/karma) in a headless instance of Chrome.

Karma uses a real browser environment for executing the tests, meaning that there is no need to mock any browser behavior. This is important when testing the behavior of an SVG, which behaves differently than other HTML elements.

### Debugging tests

The project has a configured debug task for VS code. It makes it possible to attach a debug session to a running test session.

- Start the test runner by executing `npm test`.
- Set a breakpoint in your code
- Launch the `Attach Karma Chrome` debug task from the VS Code debugger view.
- Make any minor file change to trigger a new test run.
