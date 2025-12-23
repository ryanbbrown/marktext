# MarkText Fork Changelog

This document describes all changes made in this fork compared to the main [marktext/marktext](https://github.com/marktext/marktext) repository.

---

## Overview

This fork adds a **Notion-style database feature** to MarkText, allowing users to manage collections of markdown files as structured database pages with custom properties, sorting, and filtering. Database views open as tabs alongside regular file tabs.

---

## Features

### Database Management
- SQLite-backed database storage (`better-sqlite3`)
- Each database lives in a `database/` subfolder containing `database.sqlite`
- Automatic scanning for databases when opening a project
- Databases appear in sidebar with table icon and "DB" badge

### Notion-Style Table
- Drag-and-drop row reordering
- Resizable columns with persistent column order
- Inline cell editing for all property types
- Property types: text, number, select, date, checkbox
- Add/edit/delete columns via header menu
- Advanced filtering with multiple conditions
- Click page title to open the markdown file

### Tab Integration
- Database views open as tabs (like file tabs)
- Tabs show table icon for databases
- Tab context menu works for database tabs (copy path, show in folder)
- Switching between database and file tabs works seamlessly

---

## Files Added

### Backend (`src/main/database/`)

| File | Description |
|------|-------------|
| `index.js` | `DatabaseManager` class - CRUD for databases, pages, properties with atomic transactions |
| `schema.js` | SQLite schema and demo data seeding |
| `ipcHandlers.js` | IPC handlers for renderer communication, project database scanning |
| `propertyTypes.js` | Property type definitions and column value getters |

### Notion Table (`src/renderer/components/notion-table/`)

| File | Description |
|------|-------------|
| `NotionTable.vue` | Main table with drag-drop, resize, inline editing |
| `CellEditor.vue` | Inline cell editors for each property type |
| `AddColumnDialog.vue` | Create new property dialog |
| `EditColumnDialog.vue` | Edit property name/type/config |
| `ColumnHeaderMenu.vue` | Column context menu |
| `FilterBar.vue` | Active filter chips |
| `FilterModal.vue` | Advanced filtering UI |
| `index.js` | Module exports |

### Database Components (`src/renderer/components/database/`)

| File | Description |
|------|-------------|
| `DatabaseInlineView.vue` | Database view rendered in tab content area |
| `DatabaseTableAdapter.vue` | Connects NotionTable to Vuex store |
| `PageEditorModal.vue` | Modal for editing page properties |

### Sidebar (`src/renderer/components/sideBar/`)

| File | Description |
|------|-------------|
| `treeDatabase.vue` | Sidebar node for database folders |

### State (`src/renderer/store/`)

| File | Description |
|------|-------------|
| `database.js` | Vuex module for database state |

---

## Files Modified

### Backend
- `src/main/app/accessor.js` - Initialize DatabaseManager on startup

### Renderer
- `src/renderer/main.js` - Register Element UI table components
- `src/renderer/store/index.js` - Register database module
- `src/renderer/store/editor.js` - Add `OPEN_DATABASE_TAB` action, handle database tab type
- `src/renderer/store/project.js` - Scan for databases on project open, store `detectedDatabases`
- `src/renderer/pages/app.vue` - Pass database tab props to EditorWithTabs
- `src/renderer/components/editorWithTabs/index.vue` - Render DatabaseInlineView for database tabs
- `src/renderer/components/editorWithTabs/tabs.vue` - Database tab styling with icon
- `src/renderer/components/sideBar/treeFolder.vue` - Render treeDatabase for database folders
- `src/renderer/assets/styles/index.css` - Fix horizontal scroll in flex containers
- `src/renderer/router/index.js` - Removed `/database/:id` route (using tabs instead)
- `src/renderer/commands/index.js` - Removed database commands (sidebar handles it)

### Muya
- `src/muya/lib/assets/styles/index.css` - Minor style adjustment
- `src/muya/themes/default.css` - Theme variable additions

### Config
- `.gitignore` - Ignore database files, screenshots
- `package.json` - Added dependencies

---

## Files Removed

- `src/renderer/pages/database.vue` - Replaced by tab-based DatabaseInlineView

---

## Dependencies Added

| Package | Purpose |
|---------|---------|
| `better-sqlite3` | SQLite database driver |
| `uuid` | Generate unique IDs |

---

## Architecture

```
Project Folder
├── database/
│   └── database.sqlite    ← SQLite database
├── file1.md               ← Pages linked in database
├── file2.md
└── ...

Renderer State
├── editor.tabs[]          ← Now supports type: 'database'
├── project.detectedDatabases{}  ← Scanned on project open
└── database.*             ← Database-specific state
```

Database tabs have this shape:
```js
{
  id: 'unique-id',
  type: 'database',
  folderPath: '/path/to/database/folder',
  databaseId: 'uuid',
  filename: 'Database Name',
  isSaved: true
}
```
