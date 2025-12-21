/**
 * NotionTable - A Notion-like table component for Vue 2 + Element UI
 *
 * Props-driven, event-emitting table with:
 * - Inline cell editing (text, number, select, date, checkbox)
 * - Column sorting and filtering
 * - Column resize persistence
 * - Row drag-and-drop reordering
 * - Column management (add, edit, delete, reorder, hide)
 * - Built-in columns (title, createdAt, updatedAt) can be reordered/hidden
 *
 * @example
 * <notion-table
 *   :rows="rows"
 *   :columns="columns"
 *   :column-order="columnOrder"
 *   :column-widths="columnWidths"
 *   @row-open="handleRowOpen"
 *   @cell-change="handleCellChange"
 *   @column-create="handleColumnCreate"
 *   @column-update="handleColumnUpdate"
 *   @column-delete="handleColumnDelete"
 *   @column-order-change="handleColumnOrderChange"
 *   @rows-reorder="handleRowsReorder"
 * />
 */

import NotionTable from './NotionTable.vue'
import CellEditor from './CellEditor.vue'
import ColumnHeaderMenu from './ColumnHeaderMenu.vue'
import AddColumnDialog from './AddColumnDialog.vue'
import EditColumnDialog from './EditColumnDialog.vue'

export {
  NotionTable,
  CellEditor,
  ColumnHeaderMenu,
  AddColumnDialog,
  EditColumnDialog
}

export default NotionTable
