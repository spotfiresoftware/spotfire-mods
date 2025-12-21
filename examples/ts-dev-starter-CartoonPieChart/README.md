# Cartoon Pie Chart (TypeScript)

This mod renders the Apache ECharts "Pie Pattern" example using Spotfire data bindings.
It supports categorical labels on the X-axis and a continuous measure on the Y-axis to size
pattern-filled pie slices, honoring Spotfire colors and marking.

## Prerequisites
- [Node.js](https://nodejs.org/en/) (includes npm)

## Development
1. Run `npm install` to restore dependencies (requires internet access to fetch ECharts).
2. Build with `npm run build` or start a watcher via `npm run build:dev`.
3. Launch the dev server using `npm run server` (served from `src/`) and connect from Spotfire Analyst.
4. Edit `src/main.ts` and rebuild when changes are made.

## Packaging without a dev server
Build the project and point Spotfire to the `mod-manifest.json` in the `src` folder. All static
assets (HTML, CSS, icon) now live next to the manifest, and the bundled script is emitted to
`src/build/main.js`.
