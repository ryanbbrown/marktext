# Element UI Table CSS Fixes

## Problem

Element UI's `el-table` component was rendering incorrectly within the app:
- Uneven borders (thicker in the middle vs outside)
- Extra container/box with border around the table
- Gap between header row and body rows

The same `el-table` worked correctly in a standalone HTML file, indicating the issue was caused by global CSS styles in the app conflicting with Element UI's expected styling.

## Root Cause

The Muya markdown editor uses global `table` selectors to style markdown tables. These styles were bleeding into Element UI's `el-table` component because they weren't scoped to the editor.

Key problematic styles:
1. `table { border-collapse: collapse; }` - Conflicts with el-table's `border-collapse: separate`
2. `table tr th::before, table tr td::before { ... border ... }` - Added pseudo-element borders to all table cells
3. `table { margin: 0.5em 0; }` - Added margin to all tables, causing gaps

## Solution

Scoped all global table styles to only apply within the markdown editor (`#ag-editor-id`).

## Files Changed

### `src/muya/lib/assets/styles/index.css`
- Line 500: Changed `table { ... }` to `#ag-editor-id table { ... }`

### `src/muya/themes/default.css`
- Line 273: Changed `table` to `#ag-editor-id table` in the margin rule
- Lines 379-545: Prefixed all `table` selectors with `#ag-editor-id`

### `static/themes/default.css`
- Same changes as `src/muya/themes/default.css` (this file appears to be a copy used for exports)

## Result

Markdown tables in the editor continue to render correctly, while `el-table` and other tables outside the editor now use Element UI's default styling without interference.
