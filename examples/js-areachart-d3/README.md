# Area Chart 
This is a complex mod example demonstrating an area chart rendered with `d3` and bundled with `Webpack`.


## How to get started
- Open a terminal at the location of Area Chart example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm start`. This will bundle the JavaScript and place it in the `dist` folder. This task will watch for changes in code and will continue running until it is stopped.
- Run `npm run server` in a separate terminal. This will start a development server.
- Start editing, e.g `src/index.js`

## Working without development server
- Open a terminal at the location of Area Chart example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run build`. This will bundle the JavaScript and place it in the `dist` folder. It also copies the contents of `static` into `dist`. This task will not watch for changes in code.
- In Spotfire, browse for the _manifest_ and point to the one in `dist` folder (**not the one in `static` folder**)
  