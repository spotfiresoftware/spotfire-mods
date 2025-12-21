# ECharts Graph (Spotfire Mod)

This example demonstrates how to use Apache ECharts's graph (network) visualization inside a Spotfire mod.

## Data mapping
- Node axis (categorical): optional; provides node ids or labels.
- Link axis (categorical): if two levels are present, they map to [source, target]. If a single level is used, we expect a string with source and target separated by a delimiter (not implemented in first pass).
- Size axis (continuous): optional node size (applies to nodes if present).
- X/Y axes (continuous): optional precomputed coordinates for nodes.

## Running locally
- npm install
- npm run build
- npm run server

Open Spotfire and connect the mod by pointing to the dev server's `mod-manifest.json` (default port 3070).