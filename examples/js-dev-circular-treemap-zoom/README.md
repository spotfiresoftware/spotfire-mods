# Circular Treemap (Zoom)
This mod example is a zoom-focused circular treemap implemented with [d3](https://d3js.org/). It shows how hierarchies in mod data views can be mapped to d3 hierarchies and includes the improved label selection and hover affordances from the zoomable sample.

It also illustrates some basic concepts, such as using a color axis, and implementing simple marking and tooltips.

All source code for the mod example can be found in the `src` folder.

## Prerequisites
These instructions assume that you have [Node.js](https://nodejs.org/en/) (which includes npm) installed.

## How to get started (with development server)
- Open a terminal at the location of this example.
- Run `npm install`. This will install necessary tools. Run this command only the first time you are building the mod and skip this step for any subsequent builds.
- Run `npm run server`. This will start a development server.
- Start editing, for example `spotfire-mods\examples\js-dev-circular-treemap-zoom\src\circular-treemap.js`.
- In Spotfire, follow the steps of creating a new mod and connecting to the development server.

## Working without a development server
- In Spotfire, follow the steps of creating a new mod and then browse for, and point to, the _manifest_ in the `src` folder.


Customization Guide
## Quick Reference

All customizable settings for parent labels are in **`src/circular-treemap.js`**

---

## 1. **Change the Cap Limit (Default: 5 parents)**

### Current Setting
```javascript
// Line 652
selectTopParentNodes(focusNode, 5)
```

### To Show 10 Parents Instead
```javascript
selectTopParentNodes(focusNode, 10)
```

### To Show Only Top 3
```javascript
selectTopParentNodes(focusNode, 3)
```

**Impact:** Controls how many parent clusters are labeled at the next hierarchy level. Higher values = more labels.

---

## 2. **Change the Color**

### Current Setting
```javascript
// Line 658
.style("fill", d3.hsl("#bdbdbdff"))  // Light gray
```

### Other Color Options
```javascript
// Darker gray
.style("fill", d3.hsl("#666666ff"))

// Blue
.style("fill", d3.hsl("#0066ccff"))

// Green  
.style("fill", d3.hsl("#00aa00ff"))

// Red
.style("fill", d3.hsl("#cc0000ff"))
```

**Tip:** Use a color slightly different from leaf labels so they stand out as secondary guidance.

---

## 3. **Change the Opacity (Default: 75%)**

### Current Setting
```javascript
// Line 696
sel.style('opacity', shouldShow ? 0.75 : 0)
```

### To Make More Opaque (85%)
```javascript
sel.style('opacity', shouldShow ? 0.85 : 0)
```

### To Make More Transparent (50%)
```javascript
sel.style('opacity', shouldShow ? 0.50 : 0)
```

**Range:** 0.0 (invisible) to 1.0 (fully opaque)  
**Current:** 0.75 = 75% opaque, 25% transparent

---

## 4. **Change Font Weight (Default: 900 = Extra Bold)**

### Current Setting
```javascript
// Line 660
.style("font-weight", "900")
```

### Options
```javascript
"400"  // Light
"600"  // Semi-bold  
"700"  // Bold
"800"  // Extra bold
"900"  // Ultra bold (current)
```

---

## 5. **Change Font Size Scaling**

Parent label font size is calculated as: **`d.r * k * 0.25`**

Where:
- `d.r` = node radius
- `k` = zoom scale
- `0.25` = **scaling factor** (customizable)

### Larger Parent Labels
```javascript
// Line 694 - Change from 0.25 to larger value
const scaleFactor = 0.35;  // Makes parent labels bigger
const renderedFontPx = Math.min(Math.max(d.r * k * 0.35, 8), 32);
```

### Smaller Parent Labels
```javascript
const scaleFactor = 0.15;  // Makes parent labels smaller
const renderedFontPx = Math.min(Math.max(d.r * k * 0.15, 8), 32);
```

---

## 6. **Change Minimum/Maximum Font Sizes**

Current behavior: Parent labels render between **8px** and **32px**

### Make Larger
```javascript
// Line 694 - Change second/third parameters
const renderedFontPx = Math.min(Math.max(d.r * k * 0.25, 10), 48);
// Now: 10px minimum, 48px maximum
```

### Make Smaller
```javascript
const renderedFontPx = Math.min(Math.max(d.r * k * 0.25, 6), 20);
// Now: 6px minimum, 20px maximum
```

---

## 7. **Hide Parent Labels Entirely**

### Option A: Comment Out the Call
```javascript
// Line 561 (in zoomTo)
// updateParentLabels(targetNode, k);  // Disabled

// Line 731 (in applyFocusImmediate)
// updateParentLabels(targetNode, k);  // Disabled

// Line 752 (initial render)
// updateParentLabels(d3Root, 1);  // Disabled
```

### Option B: Early Return
```javascript
// Add at start of updateParentLabels function (line 640)
function updateParentLabels(focusNode, k) {
    return;  // Exit immediately - no labels rendered
    // ... rest of code
}
```

---

## 8. **Show More Hierarchy Levels**

Current logic: Shows **only next immediate level** (`relDepth === 1`)

To show **2 levels** instead:
```javascript
// Line 633 - Change the depth check
return d.depth - focusNode.depth === 1 || d.depth - focusNode.depth === 2;
```

To show **up to 3 levels**:
```javascript
// Line 633
const relDepth = d.depth - focusNode.depth;
return relDepth >= 1 && relDepth <= 3;
```

⚠️ **Warning:** More levels = more visual clutter. Use with caution.

---

## 9. **Change the Sparse Parent Rule (>2 children)**

Current: Only label parents with **>2 children**

### Label parents with >1 child
```javascript
// Line 631 - Change from > 2 to > 1
if (!d.children || d.children.length <= 1) return false;
```

### Label all parents (even with just 1 child)
```javascript
if (!d.children) return false;  // Remove the length check entirely
```

---

## 10. **Add Text Shadow or Outline**

For better readability over dense backgrounds:

```javascript
// After line 660 (font-weight)
.style("text-shadow", "1px 1px 2px rgba(0,0,0,0.3)")
```

Or use SVG `<tspan>` with background (more complex):
```javascript
// Add white background rect behind each label
const bg = sel.enter()
    .insert("rect", "text.parent-label")
    .attr("class", "parent-label-bg")
    .style("fill", "white")
    .style("opacity", 0.7)
    // ... position and size to label
```

---

## Testing Your Changes

After modifying `src/circular-treemap.js`:

1. **Check syntax:**
   ```bash
   node -c src/circular-treemap.js
   ```

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Test in Spotfire:**
   - Load the visualization
   - Verify parent labels appear/change as expected
   - Check zoom behavior
   - Verify leaf labels are unchanged

---

## Common Scenarios

### "I want parent labels more prominent"
1. Increase cap limit: `10` instead of `5`
2. Increase opacity: `0.85` instead of `0.75`
3. Increase font scaling: `0.35` instead of `0.25`

### "I want minimal visual clutter"
1. Decrease cap limit: `3` instead of `5`
2. Decrease opacity: `0.5` instead of `0.75`
3. Decrease font scaling: `0.15` instead of `0.25`

### "I want parent labels to match a specific color scheme"
1. Update color at line 658
2. Use your brand hex color: `.style("fill", d3.hsl("#YOUR_COLOR_HEX"))`

### "I want labels smaller than 8px"
1. Change minimum: Line 694 `Math.max(..., 6)` for 6px minimum

---

## Reverting to Defaults

If you make changes and want to go back, the **default values** are:

```javascript
// Line 652: Cap limit
selectTopParentNodes(focusNode, 5)

// Line 658: Color  
.style("fill", d3.hsl("#bdbdbdff"))

// Line 660: Font weight
.style("font-weight", "900")

// Line 694: Font size
const renderedFontPx = Math.min(Math.max(d.r * k * 0.25, 8), 32);

// Line 696: Opacity
sel.style('opacity', shouldShow ? 0.75 : 0)

// Line 633: Show only next level
return d.depth - focusNode.depth === 1;

// Line 631: Sparse parent rule
if (!d.children || d.children.length <= 2) return false;
```

---

## Questions?

Refer to these guides for more context:
- [README_PARENT_LABELS.md](README_PARENT_LABELS.md) - Overview & behavior
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details
- [CODE_LOCATIONS.md](CODE_LOCATIONS.md) - Exact line references
