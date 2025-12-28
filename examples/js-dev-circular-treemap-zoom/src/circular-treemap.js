/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check  - Get type warnings from the TypeScript language server. Remove if not wanted.
Spotfire.initialize(function (mod) {
    "use strict";
    console.log("circular-treemap initializing...");

    // Store svg element into which all rendering is performed.
    const svg = d3.select("svg");

    // Setup a canvas rendering context to measure strings for labels
    const canvas = document.createElement("canvas");
    const labelCtx = canvas.getContext("2d");

    // Get the render context used to signal render completion.
    const renderCtx = mod.getRenderContext();

    // PERSISTENT STATE: Keep zoom focus across re-renders (Spotfire triggers re-render on mark)
    // We store the focus path (array of formattedValue) rather than node object so we
    // can re-resolve the focused node after a full re-render which creates new d3 nodes.
    let persistentFocusPath = null;
    let lastD3Root = null;
    let showParentLabels = true;  // Toggle state for parent labels visibility

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
        return sfNode.children ? sfNode.children.filter(isNonEmptyNode) : null;
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
            return null;
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
        const hex = getColor(d3Node);
        if (!hex) {
            return d3.hsl("#313336");
        }
        const color = d3.hsl(hex);
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
        // Render without using transform-based scale to avoid glyph scaling artifacts
        svg.append("text")
            .attr("x", d3Node.x)
            .attr("y", d3Node.y + baselineOffset)
            .attr("text-anchor", "middle")
            .attr("pointer-events", "none")
            .attr("fill", getTextColor(d3Node))
            .style("font-size", (fontSizePx * scale) + "px")
            .text(text);
    }

    /**
     * Selects which leaf nodes should receive labels.
     * If all values are equal (e.g. no size expression), picks a random subset
     * to avoid hiding all labels. Otherwise the largest leaves by value are used.
     *
     * @param {d3.HierarchyNode<Spotfire.DataViewHierarchyNode>[]} leaves
     * @param {number} maxLabels
     */
    function selectLabelNodes(leaves, maxLabels) {
        if (leaves.length <= maxLabels) {
            return leaves;
        }

        const sorted = [...leaves].sort((a, b) => (b.value || 0) - (a.value || 0));
        const minValue = sorted[sorted.length - 1].value || 0;
        const maxValue = sorted[0].value || 0;

        if (maxValue === minValue) {
            // All values are identical. Pick a random subset to avoid bias.
            for (let i = sorted.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = sorted[i];
                sorted[i] = sorted[j];
                sorted[j] = temp;
            }
        }

        return sorted.slice(0, maxLabels);
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
        console.log("🔁 render start: size=", size);

        try {
            // Check for data view errors
            const errors = await dataView.getErrors();
            if (errors.length > 0) {
                bailout(errors);
                return;
            }

        const rowCount = await dataView.rowCount();
        console.log("🔁 rowCount=", rowCount);

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

        try {
            packLayout(d3Root);
            console.log("📦 pack layout computed: root.r=", d3Root.r, "descendants=", d3Root.descendants().length);
        } catch (err) {
            console.error("❌ packLayout failed:", err);
            bailout(["Error computing layout", err && err.message]);
            return;
        }

        // Clear previous rendering, and hide any open error overlay.
        clear();
        mod.controls.errorOverlay.hide();

        // Prepare root svg size
        svg.attr("width", size.width).attr("height", size.height).attr("viewBox", `0 0 ${size.width} ${size.height}`);

        // Container group for nodes so we can scale/translate for zooms
        const container = svg.append("g").attr("class", "pack-container").style("pointer-events", "all");

        // Add transparent hit area BEHIND circles so background clicks work
        container.insert("rect", ":first-child")
            .attr("width", size.width)
            .attr("height", size.height)
            .attr("fill", "transparent")
            .style("pointer-events", "all")
            .on("click", function () {
                console.log("📍 Hit rect clicked (background)");
                zoomTo(lastD3Root);
            });

        // Create circles
        const nodes = container
            .selectAll("circle")
            .data(d3Root.descendants())
            .enter()
            .append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", (d) => d.r)
            .style("fill", getColor)
            .style("stroke", getOutlineColor)
            .style("opacity", (d) => (d.children ? "" : "1.0"))
            .style("cursor", (d) => (d.children ? "pointer" : "default"))
            .style("pointer-events", "all")
            .style("vector-effect", "non-scaling-stroke")
            .style("stroke-width", 1);


        // Update font settings for canvas element
        const fontFamily = renderCtx.styling.general.font.fontFamily;
        const fontSize = renderCtx.styling.general.font.fontSize;
        labelCtx.font = "" + fontSize + "px " + fontFamily;

        // ========== HELPER FUNCTIONS (defined early) ==========
        // Helper: get node ancestry formatted values
        function getAncestryValues(node) {
            const path = [];
            let current = node;
            while (current) {
                path.unshift(current.data.formattedValue());
                current = current.parent;
            }
            return path;
        }

        // Helper: Check if nodeA is a descendant of nodeB
        function isDescendantOf(nodeA, nodeB) {
            let current = nodeA;
            while (current) {
                if (current === nodeB) return true;
                current = current.parent;
            }
            return false;
        }

        // Helper: truncate text to fit inside circle using canvas measurements
        function truncateText(text, maxWidthPx, fontPx) {
            if (!labelCtx) {
                const avgCharPx = fontPx * 0.6;
                const maxChars = Math.floor(maxWidthPx / avgCharPx);
                if (text.length <= maxChars) return text;
                return text.slice(0, Math.max(0, maxChars - 1)) + '…';
            }
            labelCtx.font = `${fontPx}px ${fontFamily}`;
            if (labelCtx.measureText(text).width <= maxWidthPx) return text;
            let left = 0;
            let right = text.length;
            while (left < right) {
                const mid = Math.floor((left + right) / 2);
                const candidate = text.slice(0, mid) + '…';
                if (labelCtx.measureText(candidate).width <= maxWidthPx) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }
            return text.slice(0, Math.max(0, left - 1)) + '…';
        }
        // ========== END HELPERS ==========

        // Create labels for all nodes (we'll show/hide them depending on zoom)
        const labels = container
            .selectAll("text")
            .data(d3Root.leaves()) // 🔴 LEAVES ONLY
            .enter()
            .append("text")
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("pointer-events", "none")
            .style("fill", getTextColor)
            .style("font-family", fontFamily)
            .style("font-size", fontSize + "px")
            .style("text-shadow", "none")              // 🔥 kill shadow
            .style("filter", "none")                   // 🔥 kill SVG filters
            .style("paint-order", "stroke")            // stroke behind text
            .style("stroke", "none")                   // no outline
            .style("shape-rendering", "geometricPrecision")
            .style("text-rendering", "geometricPrecision")
            .text((d) => d.data.formattedValue());

        // --- Separate parent label selection (for non-leaf nodes) ---
        // This is completely independent from leaf labels.
        // We'll populate it dynamically on every zoom, respecting:
        // 1. Only non-leaf nodes with >2 children
        // 2. Top 5 per relative depth level
        // 3. Visibility constrained by focus ancestry
        const parentLabels = container
            .selectAll("text.parent-label");
        // Note: We bind data in updateParentLabels(), not here
        // This creates an empty selection initially that we'll manage dynamically

        // CANONICAL D3 ZOOM PATTERN
        // 1. Pack layout is already done above (packLayout(d3Root))
        // 2. Keep all x, y, r values stable
        // 3. Use transform to zoom the container
        // 4. Control visibility based on focus depth and ancestry
        
        // Restore focus from persistent state if possible
        lastD3Root = d3Root;
        
        // Helper: match node by ancestry formattedValue path
        function nodeMatchesPath(node, path) {
            const values = getAncestryValues(node);
            if (values.length !== path.length) return false;
            for (let i = 0; i < path.length; i++) {
                if (values[i] !== path[i]) return false;
            }
            return true;
        }

        // Update zoom level UI and back button state
        function updateZoomDisplay() {
            const zoomPath = getAncestryValues(focus) || [];
            // Use the hierarchy formatted values to reflect the actual hierarchy labels
            let zoomLabel = zoomPath.join(" / ");
            if (!zoomLabel || zoomLabel.trim() === "") zoomLabel = "Root";

            const display = d3.select("#zoomLevelDisplay");
            if (!display.empty()) display.text(`Current: ${zoomLabel}`);

            const backBtn = d3.select("#zoomBackButton");
            if (!backBtn.empty()) {
                const atRoot = zoomPath.length <= 1; // root only
                backBtn.property('disabled', atRoot);
                backBtn.style('opacity', atRoot ? 0.5 : 1);
                backBtn.attr('title', atRoot ? 'Already at root' : 'Zoom back to root');
            }
        }

        let focus = d3Root;
        if (persistentFocusPath && Array.isArray(persistentFocusPath)) {
            const found = d3Root.descendants().find((n) => nodeMatchesPath(n, persistentFocusPath));
            if (found) focus = found;
        }
        // Save the resolved focus back to persistent path (ensures it exists in this render)
        persistentFocusPath = getAncestryValues(focus);

        /**
         * Zoom to focus on a target node by:
         * - Computing scale/translate to center target and fill viewport
         * - Updating visibility based on focus depth
         * - Animating all transitions smoothly
         */
        function zoomTo(targetNode) {
            console.log("🔍 Zooming to:", targetNode.data.formattedValue(), "r:", targetNode.r);
            focus = targetNode;
            persistentFocusPath = getAncestryValues(targetNode);  // PERSIST across re-renders as path

            // Calculate zoom transform: center the target and scale to fill viewport
            const k = Math.min(size.width, size.height) / (targetNode.r * 2);
            const tx = size.width / 2 - targetNode.x * k;
            const ty = size.height / 2 - targetNode.y * k;

            console.log("📐 Transform - k:", k.toFixed(2), "tx:", tx.toFixed(1), "ty:", ty.toFixed(1));

            // Interrupt any running transitions before starting new one
            container.interrupt();

            // Animate the container transform
            container
                .transition()
                .duration(750)
                .attr("transform", `translate(${tx},${ty}) scale(${k})`)
                .on('end', () => {
                    // Ensure UI reflects final focus state after transition
                    updateZoomDisplay();
                });

            // Ensure UI updates immediately as well
            updateZoomDisplay();

            // Update circle visibility and stroke based on focus
           nodes.interrupt();
            nodes
            .transition()
            .duration(750)
            .style("opacity", (d) => {
                // Descendants of focus: fully visible leaves, faint parents
                if (isDescendantOf(d, focus)) {
                    return d.children ? 0.25 : 1.0;
                }

                // Ancestors of focus (e.g. MUU): keep visible but faint
                if (isDescendantOf(focus, d)) {
                    return 0.15;
                }

                // Everything else
                return 0;
            })
            .style("stroke", (d) => {
                // Only show stroke for visible nodes
                if (isDescendantOf(d, focus) || isDescendantOf(focus, d)) {
                    return getOutlineColor(d);
                }
                return "";
            });


                    // Update labels using dynamic font sizing + truncation (no transform scale)
            labels.interrupt();
            labels.each(function (d) {
                const sel = d3.select(this);

                // Hide labels that are not in the focused branch
                if (focus !== d3Root && isDescendantOf(focus, d)) {
                    sel.style('opacity', 0);
                    return;
                }
                if (!isDescendantOf(d, focus)) {
                    sel.style('opacity', 0);
                    return;
                }

                // Compute target rendered font size (based on scaled radius)
                const minFontPx = 6;
                const maxFontPx = 40;
                const scaleFactor = 1 / 3; // desiredRenderedFont = (d.r * k) * scaleFactor
                const renderedFontPx = Math.max(minFontPx, Math.min(maxFontPx, d.r * k * scaleFactor));

                // Truncate based on the rendered width (use scaled circle diameter)
                const maxWidthRendered = d.r * 2 * k * 0.85; // pixels
                const truncated = truncateText(d.data.formattedValue(), maxWidthRendered, renderedFontPx);

                // Update text, vertical centering and visibility
                sel.text(truncated)
                    .style('opacity', truncated ? 1 : 0)
                    .style('font-family', fontFamily)
                    .attr('dominant-baseline', 'middle');

                // Animate visual font-size (set CSS font so that after container scale k it renders as renderedFontPx)
                const endFontPx = Math.max(1, renderedFontPx / k);
                sel.transition()
                    .duration(750)
                    .styleTween('font-size', function () {
                        const node = this;
                        const startPx = parseFloat(d3.select(node).style('font-size')) || (endFontPx);
                        const interp = d3.interpolateNumber(startPx, endFontPx);
                        return function (t) {
                            d3.select(node).style('font-size', interp(t) + 'px');
                        };
                    });
            });

            // Also update label text/font-size consistency for the final state (in case transition was interrupted)
            updateLabelsForScale(k);
            
            // Recompute and update parent labels for the new focus
            if (showParentLabels) {
                updateParentLabels(targetNode, k);
            } else {
                // Hide all parent labels if toggle is off
                container.selectAll("text.parent-label").style('opacity', 0);
            }
        }

        // Helper: update labels to use dynamic font size (no transform scale) and truncation
        function updateLabelsForScale(k) {
            const minFontPx = 6;
            const maxFontPx = 40;
            const scaleFactor = 1 / 3; // desiredRenderedFont = (d.r * k) * scaleFactor

            labels.each(function (d) {
                const sel = d3.select(this);

                // Compute rendered font size based on scaled radius
                const renderedFontPx = Math.max(minFontPx, Math.min(maxFontPx, d.r * k * scaleFactor));
                // CSS font-size to set so that after container scale the visual font == renderedFontPx
                const setFontPx = Math.max(1, renderedFontPx / k);
                sel.style('font-size', setFontPx + 'px').style('font-family', fontFamily).attr('dominant-baseline', 'middle');

                // Truncate text to fit within rendered circle width
                const maxWidthRendered = d.r * 2 * k * 0.85; // pixels
                const truncated = truncateText(d.data.formattedValue(), maxWidthRendered, renderedFontPx);
                sel.text(truncated);

                // Hide labels that are too small to read
                if (renderedFontPx < minFontPx + 0.1) {
                    sel.style('opacity', 0);
                } else {
                    sel.style('opacity', 1);
                }
            });
        }

        /**
         * Select top-N parent nodes from the NEXT immediate level only (relDepth = 1).
         * This keeps the visualization clean by showing only the next hierarchy level.
         * Rules:
         * - Only non-leaf nodes with >2 children
         * - Only descendants of focus
         * - ONLY immediate next level (relativeDepth = 1)
         * - Top N nodes by d.value
         */
        function selectTopParentNodes(focusNode, topPerLevel) {
            const focusDepth = focusNode.depth;
            
            // Candidates: descendants of focus, non-leaf, >2 children, ONLY next level
            const candidates = focusNode.descendants().filter(d => {
                if (!d.children || d.children.length <= 2) return false;
                if (d === focusNode) return false; // never label focus itself
                const relDepth = d.depth - focusDepth;
                return relDepth === 1; // ONLY the immediate next level
            });
            
            // Sort by value and keep top N
            candidates.sort((a, b) => (b.value || 0) - (a.value || 0));
            return candidates.slice(0, topPerLevel);
        }
        
        /**
         * Update parent label data binding, sizing, truncation, and visibility.
         * Called during zoom and immediate focus restoration.
         */
        function updateParentLabels(focusNode, k) {
            const topParents = selectTopParentNodes(focusNode, 10); // Only next level (relDepth = 1)
            
            // Bind data to selection
            const bound = parentLabels.data(topParents, d => getAncestryValues(d).join("|"));
            
            // ENTER: Create new parent label elements
            const enter = bound.enter()
                .append("text")
                .classed("parent-label", true)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("pointer-events", "none")
                .style("fill", d3.hsl("#effcb2ff")) // neutral yellowish
                .style("font-family", fontFamily)
                .style("font-weight", "900") // semi-bold
                .style("text-shadow", "none")
                .style("filter", "none")
                .style("paint-order", "stroke")
                .style("stroke", "none")
                .style("shape-rendering", "geometricPrecision")
                .style("text-rendering", "geometricPrecision");
            
            // EXIT: Remove old parent labels
            bound.exit().remove();
            
            // MERGE: Combine enter + update selections
            const merged = enter.merge(bound);
            
            // Update positions (critical for zooming to work)
            merged.attr('x', (d) => d.x)
                  .attr('y', (d) => d.y);
            
            // Update text and styling
            merged.each(function (d) {
                const sel = d3.select(this);
                
                // Font sizing
                const minFontPx = 8;
                const maxFontPx = 32;
                const scaleFactor = 0.25;
                const renderedFontPx = Math.max(minFontPx, Math.min(maxFontPx, d.r * k * scaleFactor));
                const setFontPx = Math.max(1, renderedFontPx / k);
                
                // Update font size
                sel.style('font-size', setFontPx + 'px');
                
                // Truncate text
                const maxWidthRendered = d.r * 2 * k * 0.85;
                const truncated = truncateText(d.data.formattedValue(), maxWidthRendered, renderedFontPx);
                sel.text(truncated);
                
                // Visibility
                const shouldShow = truncated && renderedFontPx >= minFontPx + 0.1;
                sel.style('opacity', shouldShow ? 0.75 : 0);
            });
        }

        // Apply focus state immediately (no animation) to persist across re-renders
        function applyFocusImmediate(targetNode) {
            const k = Math.min(size.width, size.height) / (targetNode.r * 2);
            const tx = size.width / 2 - targetNode.x * k;
            const ty = size.height / 2 - targetNode.y * k;

            container.interrupt();
            container.attr("transform", `translate(${tx},${ty}) scale(${k})`);

            nodes.interrupt();
            nodes.style("opacity", (d) => {
                const ancOpacity = 0.08; // faint visibility for ancestors/parents
                const parentVisible = ancOpacity;
                // If d is ancestor of targetNode, show faintly (keeps encasing circle visible)
                if (targetNode !== d3Root && isDescendantOf(targetNode, d)) return ancOpacity;
                // Show descendants of target (parents faint, leaves fully opaque)
                if (isDescendantOf(d, targetNode)) return d.children ? parentVisible : "1.0";
                return "0";
            }).style("stroke", (d) => {
                const isVisible = (targetNode === d3Root || isDescendantOf(d, targetNode)) && !isDescendantOf(targetNode, d);
                if (!isVisible) return "";
                return getOutlineColor(d);
            });

            // Update labels with dynamic font sizing & truncation
            updateLabelsForScale(k);
            // Update parent labels immediately as well (respecting toggle state)
            if (showParentLabels) {
                updateParentLabels(targetNode, k);
            } else {
                container.selectAll("text.parent-label").style('opacity', 0);
            }
        }

        // Initial label sizing and truncation: show labels for largest leaves only
        const labelBudget = 50;
        const leavesForLabel = selectLabelNodes(d3Root.leaves(), labelBudget);
        // Use dynamic sizing (no transform scale) for initial render
        updateLabelsForScale(1);
        // Enforce label budget: only show selected leaves initially
        labels.style('opacity', (d) => {
            if (d.children) return 0;
            return leavesForLabel.includes(d) ? 1 : 0;
        });

        // Compute and display parent labels for initial focus (root) if enabled
        if (showParentLabels) {
            updateParentLabels(d3Root, 1);
        }

        // Apply resolved focus immediately so zoom persists across Spotfire renders
        applyFocusImmediate(focus);
        // Update zoom UI immediately after applying focus
        updateZoomDisplay();

        // Node click: zoom for non-leaf, marking for leaves
        nodes.on("click", function (d) {
            console.log("🖱️ Node clicked:", d.data.formattedValue(), "hasChildren:", !!d.children);
            if (d.children) {
                console.log("✅ Non-leaf node, zooming in...");
                zoomTo(d);
            } else {
                console.log("✅ Leaf node, marking...");
                d.data.mark(d3.event.ctrlKey ? "ToggleOrAdd" : "Replace");
                // Update outlines for immediate feedback
                container.selectAll("circle").style("stroke", getOutlineColor);
            }
            d3.event.stopPropagation();
        });

        // Tooltips & hover
        nodes.on("mouseenter", function (d) {
            const sfNode = d.data;
            if (sfNode.children) {
                mod.controls.tooltip.hide();
            } else {
                mod.controls.tooltip.show(getRow(sfNode));
            }
            d3.select(this).classed("hovered", true);
        });

        nodes.on("mouseleave", function () {
            mod.controls.tooltip.hide();
            d3.select(this).classed("hovered", false);
        });

        // UI Controls: Create or update (guard against multiple renders)
        let backButtonContainer = d3.select("#zoomBackContainer");
        if (backButtonContainer.empty()) {
            // First render: create controls
            backButtonContainer = d3.select("body")
                .append("div")
                .attr("id", "zoomBackContainer")
                .style("position", "fixed")
                .style("top", "10px")
                .style("left", "10px")
                .style("z-index", "9999");

            // Parent Labels Toggle Switch (ABOVE the button)
            const toggleContainer = backButtonContainer
                .append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "8px")
                .style("padding", "6px 8px")
                .style("background-color", "#f5f5f5")
                .style("border-radius", "4px")
                .style("border", "1px solid #ddd")
                .style("margin-bottom", "8px");

            // Toggle checkbox (hidden, styled via CSS)
            const toggleCheckbox = toggleContainer
                .append("input")
                .attr("type", "checkbox")
                .attr("id", "parentLabelsToggle")
                .property("checked", showParentLabels)
                .style("display", "none");

            // Custom styled toggle switch
            const toggleSwitch = toggleContainer
                .append("div")
                .attr("class", "toggle-switch")
                .style("position", "relative")
                .style("width", "34px")
                .style("height", "18px")
                .style("background-color", showParentLabels ? "#4CAF50" : "#ccc")
                .style("border-radius", "9px")
                .style("cursor", "pointer")
                .style("transition", "background-color 0.3s ease")
                .style("border", "none")
                .style("outline", "none");

            // Toggle slider circle
            const toggleSlider = toggleSwitch
                .append("div")
                .style("position", "absolute")
                .style("top", "2px")
                .style("left", showParentLabels ? "16px" : "2px")
                .style("width", "14px")
                .style("height", "14px")
                .style("background-color", "white")
                .style("border-radius", "50%")
                .style("transition", "left 0.3s ease")
                .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)");

            // Toggle label
            toggleContainer
                .append("label")
                .attr("for", "parentLabelsToggle")
                .text("Parent Labels")
                .style("cursor", "pointer")
                .style("user-select", "none")
                .style("font-size", "13px")
                .style("font-weight", "500")
                .style("color", "#333");

            // Toggle click handler
            toggleSwitch.on("click", function () {
                showParentLabels = !showParentLabels;
                console.log(`🔆 Parent labels ${showParentLabels ? "ON" : "OFF"}`);

                // Update toggle appearance
                d3.select(this)
                    .style("background-color", showParentLabels ? "#4CAF50" : "#ccc");

                d3.select(this).select("div")
                    .transition()
                    .duration(250)
                    .style("left", showParentLabels ? "16px" : "2px");

                // Update checkbox state
                toggleCheckbox.property("checked", showParentLabels);

                // Immediately update parent labels visibility
                if (showParentLabels) {
                    updateParentLabels(focus, Math.min(size.width, size.height) / (focus.r * 2));
                } else {
                    // Hide all parent labels - use live selector from container
                    container.selectAll("text.parent-label").style('opacity', 0);
                }
            });

            // Checkbox change handler (for accessibility)
            toggleCheckbox.on("change", function () {
                const isChecked = d3.select(this).property("checked");
                showParentLabels = isChecked;
                console.log(`🔆 Parent labels ${showParentLabels ? "ON" : "OFF"}`);

                // Update toggle appearance
                toggleSwitch
                    .style("background-color", showParentLabels ? "#4CAF50" : "#ccc");

                toggleSwitch.select("div")
                    .transition()
                    .duration(250)
                    .style("left", showParentLabels ? "16px" : "2px");

                // Update parent labels visibility
                if (showParentLabels) {
                    updateParentLabels(focus, Math.min(size.width, size.height) / (focus.r * 2));
                } else {
                    container.selectAll("text.parent-label").style('opacity', 0);
                }
            });

            // Zoom Back to Root Button (BELOW the toggle)
            backButtonContainer
                .append("button")
                .attr("id", "zoomBackButton")
                .text("↩ Zoom Back to Root")
                .style("padding", "8px 12px")
                .style("background-color", "#4CAF50")
                .style("color", "white")
                .style("border", "none")
                .style("border-radius", "4px")
                .style("cursor", "pointer")
                .style("font-size", "14px")
                .on("click", () => {
                    console.log("🔙 Back button clicked");
                    zoomTo(lastD3Root);
                });

            // Zoom Level Display
            backButtonContainer
                .append("div")
                .attr("id", "zoomLevelDisplay")
                .style("margin-top", "8px")
                .style("padding", "6px")
                .style("background-color", "#333")
                .style("color", "#fff")
                .style("border-radius", "4px")
                .style("font-size", "12px");
        }

        // Update zoom level display on every render
        const zoomPath = getAncestryValues(focus);
        const zoomLabel = focus === d3Root ? "Root" : zoomPath.join(" / ");
        d3.select("#zoomLevelDisplay").text(`Current: ${zoomLabel}`);

        // Update back button enabled/disabled state
        const backBtn = d3.select("#zoomBackButton");
        if (!backBtn.empty()) {
            backBtn.property('disabled', focus === d3Root);
            backBtn.style('opacity', focus === d3Root ? 0.5 : 1);
        }
        } catch (err) {
            console.error("❌ render failed:", err);
            bailout(["Render error", err && err.message]);
        }
    }
});
