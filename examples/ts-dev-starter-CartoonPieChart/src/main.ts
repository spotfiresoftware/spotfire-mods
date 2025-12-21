/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import * as echarts from "echarts/core";
import type { ComposeOption, EChartsType } from "echarts/core";
import { LegendComponent, TooltipComponent } from "echarts/components";
import type { LegendComponentOption, TooltipComponentOption } from "echarts/components";
import { PieChart } from "echarts/charts";
import type { PieSeriesOption } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
// CallbackDataParams type not available in this dev dependency — use a loose type in the formatter below.

echarts.use([LegendComponent, TooltipComponent, PieChart, CanvasRenderer]);

type EChartsOption = ComposeOption<LegendComponentOption | TooltipComponentOption | PieSeriesOption>;

const container = document.querySelector<HTMLDivElement>("#mod-container");
let chart: EChartsType | null = null;

type PieDatum = {
    name: string;
    value: number;
    row: Spotfire.DataViewRow;
    itemStyle: {
        color: string | CanvasPattern;
        borderColor: string;
        borderWidth: number;
        opacity: number;
    };
};

type PatternFactory = (color: string) => CanvasPattern | string;

Spotfire.initialize((mod) => {
    const renderContext = mod.getRenderContext();
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());

    reader.subscribe(async (dataView, size) => {
        await render(mod, renderContext, dataView, size);
        renderContext.signalRenderComplete();
    });
});

async function render(
    mod: Spotfire.Mod,
    renderContext: Spotfire.RenderContext,
    dataView: Spotfire.DataView,
    size: Spotfire.Size
) {
    if (!container) {
        return;
    }

    mod.controls.tooltip.hide();

    const errors = await dataView.getErrors();
    if (errors.length > 0) {
        bailout(mod, errors);
        return;
    }

    const rowCount = await dataView.rowCount();
    if (!rowCount) {
        bailout(mod);
        return;
    }

    const maxRows = 5000;
    if (rowCount > maxRows) {
        bailout(mod, `Too much data. Limit the visualization to ${maxRows} rows or fewer.`);
        return;
    }

    const hierarchy = await dataView.hierarchy("X");
    const root = await hierarchy?.root();

    if (!root) {
        return;
    }

    const leaves = root.leaves();
    if (leaves.length === 0) {
        bailout(mod, "Add a categorical column to the X-axis.");
        return;
    }

    const measureAxis = await dataView.continuousAxis("Y");
    if (!measureAxis) {
        bailout(mod, "Add a measure to the Y-axis.");
        return;
    }

    const nodeWithMultipleRows = leaves.find((node) => node.rows().length !== 1);
    if (nodeWithMultipleRows) {
        bailout(mod, "Categorical coloring must also be part of the category axis.");
        return;
    }

    const pieData = buildPieData(leaves);
    if (pieData.length === 0) {
        bailout(mod);
        return;
    }

    const isAnythingMarked = pieData.some((item) => item.row.isMarked());
    if (isAnythingMarked) {
        pieData.forEach((item) => {
            if (!item.row.isMarked()) {
                item.itemStyle.opacity = 0.35;
            }
        });
    }

    ensureChart(size, renderContext);
    mod.controls.errorOverlay.hide();

    const option: EChartsOption = {
        backgroundColor: renderContext.styling.general.backgroundColor,
        tooltip: {
            trigger: "item",
            formatter: (params: any) => {
                const data = params.data as PieDatum;
                const measure = data.row.continuous("Y");
                return `${params.name}<br/>${measure.formattedValue()}`;
            },
        },
        legend: {
            orient: "vertical",
            left: "left",
            textStyle: {
                color: renderContext.styling.general.font.color,
                fontFamily: renderContext.styling.general.font.fontFamily,
                fontSize: renderContext.styling.general.font.fontSize,
            },
        },
        series: [
            {
                name: "Value",
                type: "pie",
                radius: ["32%", "72%"],
                padAngle: 2,
                avoidLabelOverlap: false,
                itemStyle: {
                    shadowBlur: 12,
                    shadowOffsetX: 0,
                    shadowOffsetY: 8,
                    shadowColor: "rgba(0, 0, 0, 0.15)",
                    borderColor: "#ffffff",
                    borderWidth: 2,
                },
                label: {
                    color: renderContext.styling.general.font.color,
                    fontFamily: renderContext.styling.general.font.fontFamily,
                    fontSize: renderContext.styling.general.font.fontSize,
                    formatter: "{b}\n{d}%",
                },
                labelLine: {
                    smooth: true,
                    length: 12,
                    length2: 8,
                },
                data: pieData as any,
            },
        ],
    };

    chart!.setOption(option, true);

    chart!.off("click");
    chart!.on("click", (params) => {
        const datum = params.data as PieDatum | undefined;
        if (!datum) {
            return;
        }

        const mouseEvent = params.event && (params.event.event as MouseEvent | undefined);
        datum.row.mark(mouseEvent?.ctrlKey ? "ToggleOrAdd" : "Replace");
    });
}

function ensureChart(size: Spotfire.Size, renderContext: Spotfire.RenderContext) {
    if (!container) {
        return;
    }

    if (!chart) {
        chart = echarts.init(container, undefined, {
            renderer: "canvas",
        });
    }

    container.style.width = `${size.width}px`;
    container.style.height = `${size.height}px`;
    chart.resize({ width: size.width, height: size.height });

    const font = renderContext.styling.general.font;
    document.documentElement.style.setProperty("--sf-font-family", font.fontFamily);
    document.documentElement.style.setProperty("--sf-font-size", `${font.fontSize}px`);
}

function bailout(mod: Spotfire.Mod, messages?: string | string[]) {
    chart?.clear();
    if (messages) {
        if (Array.isArray(messages)) {
            mod.controls.errorOverlay.show(messages);
        } else {
            mod.controls.errorOverlay.show(messages);
        }
    } else {
        mod.controls.errorOverlay.hide();
    }
}

function buildPieData(leaves: Spotfire.DataViewHierarchyNode[]): PieDatum[] {
    const factories: PatternFactory[] = [
        createDots,
        createDiagonal,
        createGrid,
        createCross,
    ];

    return leaves.map((node, index) => {
        const row = node.rows()[0];
        const measure = row.continuous("Y");
        const value = Number(measure.value()) || 0;
        const baseColor = row.color().hexCode;
        const pattern = factories[index % factories.length](baseColor);

        return {
            name: node.formattedValue(),
            value,
            row,
            itemStyle: {
                color: pattern,
                borderColor: "#ffffff",
                borderWidth: 2,
                opacity: 1,
            },
        };
    });
}

function createDots(color: string): CanvasPattern {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = withAlpha("#ffffff", 0.7);
    const centers = [
        [8, 8],
        [24, 8],
        [8, 24],
        [24, 24],
    ];
    centers.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    return ctx.createPattern(canvas, "repeat")!;
}

function createDiagonal(color: string): CanvasPattern {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = withAlpha("#ffffff", 0.65);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, 32);
    ctx.lineTo(32, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 40);
    ctx.lineTo(40, 8);
    ctx.stroke();

    return ctx.createPattern(canvas, "repeat")!;
}

function createGrid(color: string): CanvasPattern {
    const canvas = document.createElement("canvas");
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = withAlpha("#ffffff", 0.5);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(28, 14);
    ctx.moveTo(14, 0);
    ctx.lineTo(14, 28);
    ctx.stroke();

    return ctx.createPattern(canvas, "repeat")!;
}

function createCross(color: string): CanvasPattern {
    const canvas = document.createElement("canvas");
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = withAlpha("#ffffff", 0.55);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(24, 24);
    ctx.moveTo(4, 24);
    ctx.lineTo(24, 4);
    ctx.stroke();

    return ctx.createPattern(canvas, "repeat")!;
}

function withAlpha(hexColor: string, alpha: number): string {
    const result = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor);
    if (!result) {
        return hexColor;
    }

    const [r, g, b] = result.slice(1).map((value) => parseInt(value, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
