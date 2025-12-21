/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check  - Get type warnings from the TypeScript language server. Remove if not wanted.
Spotfire.initialize(function (mod) {
    "use strict";

    // Store svg element into which all rendering is performed.
    const svg = d3.select("svg");

    // Setup a canvas rendering context to measure strings for labels
    const canvas = document.createElement("canvas");
    const labelCtx = canvas.getContext("2d");

    // Get the render context used to signal render completion.
    const renderCtx = mod.getRenderContext();

    // Setup reader/rendering loop
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());
    reader.subscribe(async (dataView, size) => {
        // Do the actual rendering
        await render(dataView, size);

        // Always signal to the framework that rendering has completed
        // or export rendering (to PDF or dxp file thumbnail image) will hang.
        renderCtx.signalRenderComplete();
    });

    /**
     * Gets a row in the data view for a hierarchy node.
     * @param {Spotfire.DataViewHierarchyNode} sfNode
     */
    function getRow(sfNode) {
        const rows = sfNode.rows();

        if (rows.length !== 1) {
            console.log("Something is wrong: getRow called for rows.length=" + rows.length);
        }

        return rows[0];
    }

    /**
     * Gets the child nodes that have rows in the data view.
     * @param {Spotfire.DataViewHierarchyNode} sfNode
     */
    function getNonEmptyChildren(sfNode) {
        return sfNode.children ? sfNode.children.filter(isNonEmptyNode) : isNonEmptyNode(sfNode);
    }

    /**
     * Checks if the node has any rows in the data view.
     * @param {Spotfire.DataViewHierarchyNode} sfNode
     */
    function isNonEmptyNode(sfNode) {
        return sfNode.children ? sfNode.children.some(isNonEmptyNode) : sfNode.rows().length > 0;
    }

    /**
     * Gets the color for a node in the d3 hierarchy.
     * @param d3node
     */
    function getColor(d3node) {
        if (d3node.children) {
            // No color for non-leaf nodes.
            return "";
        }

        return getRow(d3node.data).color().hexCode;
    }

    /**
     * Gets the outline color for a node in the d3 hierarchy.
     * @param d3node
     */
    function getOutlineColor(d3node) {
        if (d3node.children) {
            return "";
        }

        const row = getRow(d3node.data);
        if (!row.isMarked()) {
            return "";
        }

        return d3.color(row.color().hexCode).darker();
    }

    /**
     * Gets the text color to use for a node in the d3 hierarchy.
     * @param d3Node
     */
    function getTextColor(d3Node) {
        const color = d3.hsl(getColor(d3Node));
        const dark = d3.hsl("#313336");
        const light = d3.hsl("white");
        if (Math.abs(color.l - dark.l) > Math.abs(color.l - light.l)) {
            return dark;
        } else {
            return light;
        }
    }

    /**
     * Renders a label for a d3 hierarchy node.
     */
    function addLabel(d3Node, fontSizePx) {
        // Measure the text. We just use font size for height.
        const text = d3Node.data.formattedValue();
        const width = labelCtx.measureText(text).width;
        const textRadius = Math.sqrt(width * width + fontSizePx * fontSizePx) / 2;

        // Calculate the scale factor needed to fit the label inside the circle.
        const radius = d3Node.r * 0.85;
        const scale = radius / textRadius;

        if (scale * fontSizePx < 5) {
            // Text will be to small. Skip this one.
            return;
        }

        // Calculate the y offset. We need to push it down a bit. The offset should
        // really be derived from the font/text metrics.
        const baselineOffset = fontSizePx * 0.35 * scale;

        // Render the label.
        svg.append("text")
            .attr("transform", `translate(${d3Node.x},${d3Node.y + baselineOffset}) scale(${scale})`)
            .attr("text-anchor", "middle")
            .attr("pointer-events", "none")
            .attr("fill", getTextColor(d3Node))
            .text(text);
    }

    /**
     * Clears the DOM.
     */
    function clear() {
        svg.selectAll("*").remove();
    }

    /**
     * Function used in bailout clauses in main rendering function. Optionally shows message(s)
     * to the user.
     */
    function bailout(messages) {
        clear();
        if (messages) {
            mod.controls.errorOverlay.show(messages);
        } else {
            mod.controls.errorOverlay.hide();
        }
    }

    /**
     * The main rendering function
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} size
     */
    async function render(dataView, size) {
        // Clear any open tooltips
        mod.controls.tooltip.hide();

        // Check for data view errors
        const errors = await dataView.getErrors();
        if (errors.length > 0) {
            bailout(errors);
            return;
        }

        const rowCount = await dataView.rowCount();

        // Bailout for empty visualization
        if (rowCount === 0) {
            bailout();
            return;
        }

        // Bailout if there is more data than we can gracefully render.
        const maxRowCount = 5000;
        if (rowCount > maxRowCount) {
            bailout(`Sorry. There is currently too much data. This visualization cannot handle more than ${maxRowCount} rows,
            and there are currently ${rowCount} of them. Try filtering or change the configuration.`);
            return;
        }

        // Get the hierarchy
        const hierarchy = await dataView.hierarchy("Hierarchy");
        const sfRoot = await hierarchy.root();
        if (sfRoot === null) {
            // If we get null back here, that means the framework has cancelled the rendering.
            return;
        }

        // Detect categorical coloring issues. In that case there are leaf nodes with more than one row.
        const leaves = sfRoot.leaves();
        if (leaves.some((sfLeafNode) => sfLeafNode.rows().length > 1)) {
            bailout(
                "When using categorical coloring, the expression used on the color axis must also be among the expressions used on the hierarchy axis."
            );
            return;
        }

        const sizeAxis = await dataView.continuousAxis("Size");
        const getSize = function (sfNode) {
            if (sizeAxis !== null) {
                return getRow(sfNode).continuous("Size").value();
            }

            // Constant size when size axis has empty expression.
            return 1;
        };

        // Wrap Spotfire hierarchy in a d3 hierarchy, and rollup size value. Pass a special children accessor
        // that will filter out all nodes that do not have any data rows.
        const d3Root = d3.hierarchy(sfRoot, getNonEmptyChildren).sum(function (sfNode) {
            if (sfNode.children) {
                // returning null for non leaf nodes makes d3 do the rollup of the sum.
                return 0;
            }

            // Handle nulls and negative values. We could do something better here, but
            // for now just treat them as 0.
            let value = getSize(sfNode);
            if (value === null || value < 0) {
                value = 0;
            }

            return value;
        });

        // Create a pack layout
        const packLayout = d3.pack().size([size.width, size.height]).padding(1);

        packLayout(d3Root);

        // Clear previous rendering, and hide any open error overlay.
        clear();
        mod.controls.errorOverlay.hide();

        // Update font settings for canvas element
        const fontFamily = renderCtx.styling.general.font.fontFamily;
        const fontSize = renderCtx.styling.general.font.fontSize;
        labelCtx.font = "" + fontSize + "px " + fontFamily;

        // Nodes and circles
        const nodes = d3Root.descendants();

        const circles = svg
            .attr("width", size.width)
            .attr("height", size.height)
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", (d) => d.r)
            .style("fill", getColor)
            .style("stroke", getOutlineColor)
            .style("opacity", (d) => (d.children ? "" : "1.0"));

        // Create labels for leaves and precompute text radius for scaling
        const labels = svg
            .selectAll("text.label")
            .data(d3Root.leaves())
            .enter()
            .append("text")
            .classed("label", true)
            .attr("text-anchor", "middle")
            .attr("pointer-events", "none")
            .attr("fill", getTextColor)
            .text((d) => d.data.formattedValue())
            .each(function (d) {
                const text = d.data.formattedValue();
                const width = labelCtx.measureText(text).width;
                d._textRadius = Math.sqrt(width * width + fontSize * fontSize) / 2;
                const scale = (d.r * 0.85) / d._textRadius;
                if (scale * fontSize < 5) {
                    d._hideLabel = true;
                    d3.select(this).style("display", "none");
                } else {
                    d._hideLabel = false;
                    const baselineOffset = fontSize * 0.35 * scale;
                    d3.select(this).attr("transform", `translate(${d.x},${d.y + baselineOffset}) scale(${scale})`);
                }
            });

        // Zoom helpers
        let focus = d3Root;
        let view = [d3Root.x, d3Root.y, d3Root.r * 2];

        function zoomTo(v) {
            const k = Math.min(size.width, size.height) / v[2];
            view = v;

            circles
                .attr("cx", (d) => (d.x - v[0]) * k + size.width / 2)
                .attr("cy", (d) => (d.y - v[1]) * k + size.height / 2)
                .attr("r", (d) => d.r * k);

            labels.each(function (d) {
                if (d._hideLabel) return;
                const scale = ((d.r * k) * 0.85) / d._textRadius;
                if (scale * fontSize < 5) {
                    d3.select(this).style("display", "none");
                } else {
                    d3.select(this).style("display", null);
                    const baselineOffset = fontSize * 0.35 * scale;
                    d3.select(this).attr("transform", `translate(${(d.x - v[0]) * k + size.width / 2},${(d.y - v[1]) * k + size.height / 2 + baselineOffset}) scale(${scale})`);
                }
            });
        }

        function zoom(d) {
            focus = d;
            const v = [d.x, d.y, d.r * 2];
            const i = d3.interpolateZoom(view, v);
            const t = d3.transition().duration(750);
            t.tween("zoom", function () {
                return function (tNow) {
                    zoomTo(i(tNow));
                };
            });
        }

        // Initialize view
        zoomTo([d3Root.x, d3Root.y, d3Root.r * 2]);

        // Background click: zoom to root and clear marking
        svg.on("click", function () {
            zoom(d3Root);
            dataView.clearMarking();
        });

        // Circle click: drill into non-leaf nodes, mark leaves
        circles.on("click", function (d) {
            d3.event.stopPropagation();
            if (d.children) {
                zoom(d);
            } else {
                d.data.mark(d3.event.ctrlKey ? "ToggleOrAdd" : "Replace");
            }
        });

        // Tooltip handlers (leaf nodes only)
        circles.on("mouseenter", function (d) {
            const sfNode = d.data;
            if (sfNode.children) {
                mod.controls.tooltip.hide();
            } else {
                mod.controls.tooltip.show(getRow(sfNode));
            }
        });

        circles.on("mouseleave", function () {
            mod.controls.tooltip.hide();
        });
    }
});
