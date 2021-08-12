import { D3_SELECTION } from "../custom-types";
import { getTranslation } from "../utils";
import { config } from "../global-settings";
import * as d3 from "d3";
import { RenderInfo } from "src/interfaces";

export function renderVerticalScroll(parent: D3_SELECTION, renderInfo: RenderInfo) {
    const verticalScrollBarContainer = parent.append("g").attr("id", "VerticalScrollBarContainer");

    buildVerticalScroll(parent, verticalScrollBarContainer, renderInfo);
}

export function updateVerticalScroll(parent: D3_SELECTION, renderInfo: RenderInfo) {
    const verticalScrollBarContainer = d3.select<SVGElement, unknown>("#VerticalScrollBarContainer");
    verticalScrollBarContainer.selectAll("*").remove();

    buildVerticalScroll(parent, verticalScrollBarContainer, renderInfo);
}

function buildVerticalScroll(parent: D3_SELECTION, verticalScrollBarContainer: D3_SELECTION, renderInfo: RenderInfo) {
    const labels = d3.select("#Labels").attr("transform", `translate(${0},${0})`);
    const bars = d3.select("#Bars").attr("transform", `translate(${0},${0})`);

    const totalHeight = d3.select<SVGPathElement, unknown>("#Labels").node().getBBox().height;

    if (Math.abs(totalHeight - config.chartHeight) < 2) {
        return;
    }
    const x = config.svgWidth - config.scrollBarThickness;
    const y = config.svgHeight - config.chartHeight;
    const scale = config.chartHeight / totalHeight;
    const scrollbarHeight = scale * config.chartHeight;
    if (renderInfo.state.verticalScrollPosition === -1) {
        renderInfo.state.verticalScrollPosition = y;
    }
    let scrollPosition = renderInfo.state.verticalScrollPosition;

    if (scrollPosition < y) {
        scrollPosition = y;
    }

    const xValue = getTranslation(bars.attr("transform"))[0];
    bars.attr("transform", `translate(${xValue}, ${(y - scrollPosition) / scale})`);
    labels.attr("transform", `translate(${0},${(y - scrollPosition) / scale})`);

    const verticalScrollBar = verticalScrollBarContainer
        .append("rect")
        .attr("width", config.scrollBarThickness)
        .attr("height", scrollbarHeight)
        .attr("rx", config.scrollBarThickness / 2)
        .attr("ry", config.scrollBarThickness / 2)
        .attr("opacity", renderInfo.interactive ? 1 : 0)
        .attr("fill", "rgba(0, 0, 0, 0.3)")
        .attr("x", x)
        .attr("y", scrollPosition);

    function updateVerticalScrollPosition(deltaY: number) {
        let newScrollPosition = parseFloat(verticalScrollBar.attr("y")) + deltaY;
        newScrollPosition = Math.max(y, newScrollPosition);
        newScrollPosition = Math.min(config.svgHeight - scrollbarHeight, newScrollPosition);

        const xValue = getTranslation(bars.attr("transform"))[0];

        bars.attr("transform", `translate(${xValue}, ${(y - newScrollPosition) / scale})`);
        labels.attr("transform", `translate(${0},${(y - newScrollPosition) / scale})`);
        verticalScrollBar.attr("y", newScrollPosition);
        renderInfo.state.verticalScrollPosition = newScrollPosition;
    }

    parent.on("wheel", (e) => {
        updateVerticalScrollPosition(Math.sign(e.deltaY) * config.rowHeight * scale);
    });

    let isVerticalDragging = false;
    parent.on("mouseenter", () => {
        verticalScrollBar.attr("opacity", 1);
    });
    parent.on("mouseleave", () => {
        if (!isVerticalDragging) {
            verticalScrollBar.attr("opacity", 1);
        }
    });

    const verticalDragBehaviour = d3
        .drag()
        .on("drag", (event) => {
            updateVerticalScrollPosition(event.dy);
        })
        .on("start", () => {
            isVerticalDragging = true;
        })
        .on("end", () => {
            isVerticalDragging = false;
        });

    verticalScrollBar.call(verticalDragBehaviour);

    // Add gradient at end of chart during export to indicate overflowing content.
    if (!renderInfo.interactive && config.chartHeight < totalHeight) {
        let hiddenContent = document.createElement("div");
        hiddenContent.classList.add("hidden-content");
        document.body.appendChild(hiddenContent);
    }

    parent.on("mouseover", () => {
        verticalScrollBarContainer.style("visibility", "visible");
    }).on("mouseout", () => {
        verticalScrollBarContainer.style("visibility", "hidden");
    });
}
