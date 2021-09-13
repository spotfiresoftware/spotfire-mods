import { DataView, DataViewHierarchyNode, DataViewRow } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import { createPairs } from "./pairs";
import { Circle, render } from "./vennDiagram";

const axisName = "Color";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());

    reader.subscribe(generalErrorHandler(mod)(onChange));

    /**
     * The function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {ModProperty<string>} curveType
     */
    async function onChange(dataView: DataView, windowSize: Spotfire.Size) {
        let circleRoot = await (await dataView.hierarchy(axisName))?.root();
        let overlapRoot = await (await dataView.hierarchy("Overlap"))?.root();
        let overlaps: { [pair: string]: Circle } = {};

        // Create the initial circles.
        for (let leaf of circleRoot!.leaves()) {
            let k = leaf.leafIndex + "";
            overlaps[k] = {
                sets: [leaf.leafIndex!],
                color: getColor(leaf),

                label: leaf.formattedValue(),
                tooltip: leaf.formattedValue(),
                size: leaf.rowCount(),
                rows: leaf.rows()
            };
        }

        // Create all overlaps
        for (const leaf of overlapRoot!.leaves()) {
            let rows = leaf.rows();

            if (rows.length < 2) {
                continue;
            }

            const fullSet = leaf.rows().map((r) => r.categorical(axisName).leafIndex);

            let sets: number[][] = createPairs(fullSet);

            if (circleRoot!.leaves().length < 4) {
                sets = [fullSet, ...sets];
            }

            for (const set of sets) {
                let overlapKey = set.join("-");

                overlaps[overlapKey] = overlaps[overlapKey] ?? {
                    sets: set,
                    size: 0,
                    tooltip: rows.map((r) => r.categorical(axisName).formattedValue()).join("-"),
                    rows: []
                };

                let rowsInSet = rows.filter((r) => set.includes(r.categorical(axisName).leafIndex));

                overlaps[overlapKey].size++;
                overlaps[overlapKey].rows.push(...rowsInSet);
            }
        }

        let circles = Object.keys(overlaps).map((k) => overlaps[k]);

        render(circles, {
            size: windowSize,
            onMouseover(d) {
                mod.controls.tooltip.show(d.tooltip + ": " + d.size);
            },
            click(d) {
                console.log(d);
                if (!d) {
                    dataView.clearMarking();
                    return;
                }

                d.rows.map((r: DataViewRow) => r.mark());
            },
            getColor(set) {
                let overlapKey = set.join("-");
                return overlaps[overlapKey].color ?? "red";
            }
        });

        context.signalRenderComplete();
    }
});

function getColor(leaf: DataViewHierarchyNode) {
    const rows = leaf.rows();
    if (!rows.length) {
        return "#ddd";
    }

    let firstMarkedRow = rows.findIndex((r) => r.isMarked());
    if (firstMarkedRow == -1) {
        firstMarkedRow = 0;
    }

    return rows[firstMarkedRow].color().hexCode;
}
