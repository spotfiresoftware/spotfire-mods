/// <reference path="../node_modules/@spotfire/mods-api/visualization-mods/api.d.ts" />

import * as echarts from "echarts";

const Spotfire = (window as any).Spotfire;

Spotfire.initialize(async (mod: Spotfire.Mod) => {
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize(), mod.property("layout"), mod.property("labelOverlap"));
    const context = mod.getRenderContext();

    let chart: echarts.ECharts | undefined;

    reader.subscribe(async (dataView: Spotfire.DataView, windowSize: any, layoutProp: any, labelOverlapProp: any) => {
        try {
            const errors = await dataView.getErrors();
            if (errors.length > 0) {
                mod.controls.errorOverlay.show(errors);
                return;
            }
            mod.controls.errorOverlay.hide();

            const allRows = await dataView.allRows();
            if (!allRows) return;

            // Build nodes/links from data
            const nodeLeaves = (await (await dataView.hierarchy("Node"))?.root())?.leaves() || [];
            const linkHierarchy = await dataView.hierarchy("Link");
            const linkRoot = linkHierarchy ? await linkHierarchy.root() : null;

            const nodesMap: Record<string, any> = {};
            // If Node axis present, use it to build nodes
            if (nodeLeaves.length > 0) {
                nodeLeaves.forEach((leaf: Spotfire.DataViewHierarchyNode) => {
                    const id = String(leaf.key);
                    nodesMap[id] = {
                        id,
                        name: leaf.formattedValue(),
                        value: 1,
                        mark: () => leaf.mark(),
                    };
                });
            }

            // Extract links
            const links: any[] = [];
            if (linkRoot) {
                const leaves = linkRoot.leaves();
                leaves.forEach((leaf: Spotfire.DataViewHierarchyNode) => {
                    const row = leaf.rows()[0];
                    if (!row) return;
                    const cats = row.categorical("Link").value();
                    if (cats && cats.length >= 2) {
                        const source = String(cats[0].key);
                        const target = String(cats[1].key);
                        links.push({ source, target });
                        if (!nodesMap[source]) nodesMap[source] = { id: source, name: source, value: 1 };
                        if (!nodesMap[target]) nodesMap[target] = { id: target, name: target, value: 1 };
                    }
                });
            }

            // Size axis mapping
            const sizeHierarchy = await dataView.hierarchy("Size");
            if (sizeHierarchy && sizeHierarchy.levels.length > 0) {
                const sizeLeaves = (await sizeHierarchy.root())!.leaves();
                sizeLeaves.forEach((leaf: Spotfire.DataViewHierarchyNode) => {
                    const row = leaf.rows()[0];
                    if (!row) return;
                    const nodeId = String(leaf.key);
                    const sizeVal = row.continuous("Size").value() || 1;
                    if (nodesMap[nodeId]) nodesMap[nodeId].value = sizeVal;
                });
            }

            // X/Y mapping: optional
            const xHierarchy = await dataView.hierarchy("X");
            const yHierarchy = await dataView.hierarchy("Y");
            const haveXY = xHierarchy && yHierarchy && xHierarchy.levels.length > 0 && yHierarchy.levels.length > 0;
            if (haveXY) {
                const xLeaves = (await xHierarchy.root())!.leaves();
                const yLeaves = (await yHierarchy.root())!.leaves();
                // assume same order and keys
                xLeaves.forEach((xLeaf: Spotfire.DataViewHierarchyNode, i: number) => {
                    const id = String(xLeaf.key);
                    const xRow = xLeaf.rows()[0];
                    const xVal = xRow?.continuous("X")?.value();
                    const yRow = yLeaves[i]?.rows()[0];
                    const yVal = yRow?.continuous("Y")?.value();
                    if (nodesMap[id]) nodesMap[id].x = xVal, nodesMap[id].y = yVal;
                });
            }

            const nodes = Object.keys(nodesMap).map((k) => nodesMap[k]);

            // init chart
            const chartDom = document.getElementById("chart") as HTMLDivElement;
            if (!chart) {
                chart = echarts.init(chartDom);
                // Click handler: mark the node when clicked, clear marking when clicking empty space
                chart.on("click", (params: any) => {
                    try {
                        if (params.dataType === "node") {
                            const id = params.data?.id ?? params.data?.name ?? params.name;
                            const nodeEntry = nodesMap[id];
                            if (nodeEntry && typeof nodeEntry.mark === "function") {
                                nodeEntry.mark();
                            }
                        } else {
                            // clicking background or edge clears marking
                            dataView.clearMarking();
                        }
                    } catch (e) {
                        console.error("click handler error", e);
                    }
                });
            }

            chart.resize({ width: windowSize.width, height: windowSize.height });

            const option: echarts.EChartsOption = {
                tooltip: {},
                animation: false,
                series: [
                    {
                        type: "graph",
                        layout: layoutProp.value() === "force" ? "force" : "none",
                        roam: true,
                        // label options with optional hideOverlap
                        label: (function() {
                            const opt: any = { show: true, formatter: "{b}" };
                            if (labelOverlapProp.value() === true) opt.hideOverlap = true;
                            return opt;
                        })(),
                        force: { repulsion: 100 },
                        data: nodes,
                        edges: links,
                        emphasis: { focus: "adjacency", label: { show: true } }
                    },
                ],
            };

            chart.setOption(option);
            context.signalRenderComplete();
        } catch (e: any) {
            mod.controls.errorOverlay.show(e.message || e);
            console.error(e);
        }
    });
});
