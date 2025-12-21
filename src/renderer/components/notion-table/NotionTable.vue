<template>
  <div class="notion-table">
    <filter-bar
      :columns="orderedColumns"
      :filters="activeFilters"
      @filter-change="handleFilterChange"
      @clear-all="clearAllFilters"
    />

    <el-table
      ref="table"
      :key="tableKey"
      :data="filteredAndSortedRows"
      row-key="id"
      border
      :row-class-name="() => 'notion-table-row'"
      @header-dragend="handleColumnResize"
    >
      <el-table-column
        v-for="(col, index) in orderedColumns"
        :key="col.id"
        :prop="col.id"
        :width="getStoredWidth(col.id, null)"
        :min-width="getColumnMinWidth(col)"
        resizable
      >
        <template slot="header">
          <column-header-menu
            :column="col"
            :is-first="index === 0"
            :is-last="index === orderedColumns.length - 1"
            :can-hide="col.id !== 'title'"
            :current-sort="activeSort && activeSort.columnId === col.id ? activeSort.direction : null"
            @edit="handleEditColumn"
            @delete="handleDeleteColumn"
            @hide="handleHideColumn"
            @move="handleMoveColumn"
            @sort="handleSort"
            @insert="handleInsertColumn"
          />
        </template>
        <template slot-scope="scope">
          <!-- Title column -->
          <span v-if="col.id === 'title'" class="row-title" @click.stop="$emit('row-open', scope.row)">
            {{ scope.row.title }}
          </span>
          <!-- Date columns -->
          <template v-else-if="col.id === 'createdAt' || col.id === 'updatedAt'">
            {{ formatDate(scope.row[col.id]) }}
          </template>
          <!-- Custom property columns -->
          <cell-editor
            v-else
            :column="col"
            :value="getCellValue(scope.row, col.id)"
            @change="handleCellChange(scope.row.id, col.id, $event)"
          />
        </template>
      </el-table-column>
    </el-table>

    <!-- Inline new row creation -->
    <div v-if="isCreatingRow" class="new-row-input">
      <input
        ref="newRowInput"
        v-model="newRowTitle"
        type="text"
        placeholder="Enter page title..."
        class="new-row-title-input"
        @keydown.enter="confirmNewRow"
        @keydown.esc="cancelNewRow"
        @blur="handleNewRowBlur"
      />
    </div>

    <div
      v-else
      class="new-page-btn"
      @click="startCreatingRow"
    >
      <i class="el-icon-plus" />
      <span>New page</span>
    </div>

    <add-column-dialog
      :visible.sync="addDialogVisible"
      :hidden-built-in-columns="hiddenBuiltInColumns"
      @create="handleCreateColumn"
      @restore="handleRestoreColumn"
    />

    <edit-column-dialog
      :visible.sync="editDialogVisible"
      :column="editingColumn"
      @save="handleSaveColumn"
    />
  </div>
</template>

<script>
import Sortable from 'sortablejs'
import CellEditor from './CellEditor.vue'
import ColumnHeaderMenu from './ColumnHeaderMenu.vue'
import AddColumnDialog from './AddColumnDialog.vue'
import EditColumnDialog from './EditColumnDialog.vue'
import FilterBar from './FilterBar.vue'

export default {
  name: 'NotionTable',

  components: {
    CellEditor,
    ColumnHeaderMenu,
    AddColumnDialog,
    EditColumnDialog,
    FilterBar
  },

  props: {
    /** Array of row objects with id, title, createdAt, updatedAt, and values */
    rows: {
      type: Array,
      required: true
    },
    /** Array of custom column definitions with id, name, type, config */
    columns: {
      type: Array,
      required: true
    },
    /** Array of column IDs in display order (includes built-in: title, createdAt, updatedAt) */
    columnOrder: {
      type: Array,
      required: true
    },
    /** Object mapping column IDs to widths (from database) */
    columnWidths: {
      type: Object,
      default: () => ({})
    }
  },

  data () {
    return {
      addDialogVisible: false,
      editDialogVisible: false,
      editingColumn: null,
      sortable: null,
      activeSort: null, // { columnId: string, direction: 'asc' | 'desc' }
      activeFilters: {}, // { [columnId]: FilterConfig }
      isCreatingRow: false,
      newRowTitle: '',
      insertIndex: null // Index in columnOrder for new column insertion
    }
  },

  computed: {
    /** Built-in column definitions */
    builtInColumns () {
      return {
        title: { id: 'title', name: 'Title', type: 'text', isBuiltIn: true },
        createdAt: { id: 'createdAt', name: 'Created', type: 'date', isBuiltIn: true },
        updatedAt: { id: 'updatedAt', name: 'Updated', type: 'date', isBuiltIn: true }
      }
    },

    /** All columns (built-in + custom) as a lookup map */
    columnMap () {
      const map = { ...this.builtInColumns }
      for (const col of this.columns) {
        map[col.id] = col
      }
      return map
    },

    /** All columns for filter bar (built-in + custom) */
    allColumns () {
      return [
        this.builtInColumns.title,
        ...this.columns,
        this.builtInColumns.createdAt,
        this.builtInColumns.updatedAt
      ]
    },

    /** Columns in display order based on columnOrder prop */
    orderedColumns () {
      return this.columnOrder
        .map(id => this.columnMap[id])
        .filter(Boolean)
    },

    /** Built-in columns that are not in columnOrder (hidden) */
    hiddenBuiltInColumns () {
      const hideable = ['createdAt', 'updatedAt']
      return hideable
        .filter(id => !this.columnOrder.includes(id))
        .map(id => this.builtInColumns[id])
    },

    tableKey () {
      return this.columnOrder.join('|')
    },

    filteredAndSortedRows () {
      let result = [...this.rows]

      // Apply filters
      Object.entries(this.activeFilters).forEach(([columnId, filter]) => {
        if (!filter) return

        result = result.filter(row => {
          const cellValue = this.getFilterCellValue(row, columnId)
          return this.matchesFilter(cellValue, filter, columnId)
        })
      })

      // Apply sort
      if (this.activeSort) {
        const { columnId, direction } = this.activeSort
        const multiplier = direction === 'asc' ? 1 : -1

        result.sort((a, b) => {
          let valA, valB

          // Handle fixed columns
          if (columnId === 'title') {
            valA = a.title
            valB = b.title
          } else if (columnId === 'createdAt' || columnId === 'updatedAt') {
            valA = a[columnId]
            valB = b[columnId]
          } else {
            valA = a.values?.[columnId]
            valB = b.values?.[columnId]
          }

          if (valA == null && valB == null) return 0
          if (valA == null) return 1 * multiplier
          if (valB == null) return -1 * multiplier

          const column = this.columns.find(c => c.id === columnId)
          if (column?.type === 'number' || column?.type === 'date' || columnId === 'createdAt' || columnId === 'updatedAt') {
            return (valA - valB) * multiplier
          }
          if (column?.type === 'checkbox') {
            return ((valA ? 1 : 0) - (valB ? 1 : 0)) * multiplier
          }
          return String(valA).localeCompare(String(valB)) * multiplier
        })
      }

      return result
    }
  },

  watch: {
    tableKey () {
      this.$nextTick(() => {
        this.initRowDrag()
      })
    },
    addDialogVisible (visible) {
      if (!visible) {
        this.insertIndex = null
      }
    }
  },

  mounted () {
    this.$nextTick(() => {
      this.initRowDrag()
    })
  },

  beforeDestroy () {
    if (this.sortable) {
      this.sortable.destroy()
    }
  },

  methods: {
    initRowDrag () {
      if (this.sortable) {
        this.sortable.destroy()
        this.sortable = null
      }

      const tableEl = this.$refs.table?.$el
      if (!tableEl) return

      const tbody = tableEl.querySelector('.el-table__body-wrapper tbody')
      if (!tbody) return

      this.sortable = Sortable.create(tbody, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        draggable: 'tr',
        onEnd: ({ oldIndex, newIndex }) => {
          if (oldIndex === newIndex) return

          const newOrder = [...this.rows].map(r => r.id)
          const [movedId] = newOrder.splice(oldIndex, 1)
          newOrder.splice(newIndex, 0, movedId)

          this.$emit('rows-reorder', newOrder)
        }
      })
    },

    formatDate (timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    getCellValue (row, columnId) {
      return row.values?.[columnId] ?? null
    },

    getFilterCellValue (row, columnId) {
      if (columnId === 'title') return row.title
      if (columnId === 'createdAt' || columnId === 'updatedAt') return row[columnId]
      return row.values?.[columnId]
    },

    matchesFilter (cellValue, filter, columnId) {
      if (filter.type === 'text') {
        const searchVal = (filter.value || '').toLowerCase()
        const cellStr = String(cellValue || '').toLowerCase()
        if (filter.operator === 'contains') {
          return cellStr.includes(searchVal)
        } else {
          return !cellStr.includes(searchVal)
        }
      }

      if (filter.type === 'select') {
        return filter.values.includes(cellValue)
      }

      if (filter.type === 'checkbox') {
        const isChecked = cellValue === 1 || cellValue === true
        return filter.values.includes(isChecked)
      }

      if (filter.type === 'date') {
        if (!cellValue || !filter.value) return false
        const cellDate = new Date(cellValue).setHours(0, 0, 0, 0)
        const filterDate = new Date(filter.value).setHours(0, 0, 0, 0)

        if (filter.operator === 'eq') return cellDate === filterDate
        if (filter.operator === 'before') return cellDate < filterDate
        if (filter.operator === 'after') return cellDate > filterDate
      }

      if (filter.type === 'number') {
        const cellNum = Number(cellValue)
        const filterNum = Number(filter.value)
        if (isNaN(cellNum) || isNaN(filterNum)) return false

        switch (filter.operator) {
          case 'eq': return cellNum === filterNum
          case 'neq': return cellNum !== filterNum
          case 'gt': return cellNum > filterNum
          case 'gte': return cellNum >= filterNum
          case 'lt': return cellNum < filterNum
          case 'lte': return cellNum <= filterNum
        }
      }

      return true
    },

    getColumnMinWidth (col) {
      if (col.id === 'title') return 200
      if (col.id === 'createdAt' || col.id === 'updatedAt') return 120
      const widths = {
        text: 150,
        number: 100,
        select: 120,
        date: 140,
        checkbox: 80
      }
      return widths[col.type] || 150
    },

    getStoredWidth (columnId, defaultWidth) {
      return this.columnWidths[columnId] || defaultWidth
    },

    handleColumnResize (newWidth, oldWidth, column) {
      const columnId = column.property || column.label
      // Emit new widths - merge current widths with the new one
      const updatedWidths = { ...this.columnWidths, [columnId]: newWidth }
      this.$emit('column-resize', updatedWidths)
    },

    handleCellChange (rowId, columnId, value) {
      this.$emit('cell-change', { rowId, columnId, value })
    },

    showAddColumnDialog () {
      this.addDialogVisible = true
    },

    handleCreateColumn ({ name, type, config }) {
      this.$emit('column-create', { name, type, config, insertIndex: this.insertIndex })
      this.addDialogVisible = false
      this.insertIndex = null
    },

    handleRestoreColumn (columnId) {
      // Add the column back at the insert position (or end)
      const newOrder = [...this.columnOrder]
      const insertAt = this.insertIndex != null ? this.insertIndex : newOrder.length
      newOrder.splice(insertAt, 0, columnId)
      this.$emit('column-order-change', newOrder)
      this.insertIndex = null
    },

    handleInsertColumn ({ column, direction }) {
      const colIndex = this.columnOrder.indexOf(column.id)
      this.insertIndex = direction === 'left' ? colIndex : colIndex + 1
      this.addDialogVisible = true
    },

    handleEditColumn (column) {
      this.editingColumn = column
      this.editDialogVisible = true
    },

    handleSaveColumn ({ columnId, updates }) {
      this.$emit('column-update', { columnId, updates })
      this.editDialogVisible = false
      this.editingColumn = null
    },

    handleDeleteColumn (columnId) {
      this.$emit('column-delete', columnId)
    },

    handleHideColumn (columnId) {
      const newOrder = this.columnOrder.filter(id => id !== columnId)
      this.$emit('column-order-change', newOrder)
    },

    handleMoveColumn ({ column, direction }) {
      if (!column) return

      const currentIndex = this.columnOrder.indexOf(column.id)
      const newIndex = currentIndex + direction

      if (newIndex < 0 || newIndex >= this.columnOrder.length) return

      const newOrder = [...this.columnOrder]
      newOrder[currentIndex] = newOrder[newIndex]
      newOrder[newIndex] = column.id

      this.$emit('column-order-change', newOrder)
    },

    handleSort ({ columnId, direction }) {
      if (direction === null) {
        this.activeSort = null
      } else {
        this.activeSort = { columnId, direction }
      }
    },

    handleFilterChange ({ columnId, filter }) {
      if (filter === null) {
        this.$delete(this.activeFilters, columnId)
      } else {
        this.$set(this.activeFilters, columnId, filter)
      }
    },

    clearAllFilters () {
      this.activeFilters = {}
    },

    startCreatingRow () {
      this.isCreatingRow = true
      this.newRowTitle = ''
      this.$nextTick(() => {
        this.$refs.newRowInput?.focus()
      })
    },

    confirmNewRow () {
      const title = this.newRowTitle.trim()
      if (title) {
        this.$emit('row-create', { title })
      }
      this.isCreatingRow = false
      this.newRowTitle = ''
    },

    cancelNewRow () {
      this.isCreatingRow = false
      this.newRowTitle = ''
    },

    handleNewRowBlur () {
      // Small delay to allow enter key to fire first
      setTimeout(() => {
        if (this.isCreatingRow && !this.newRowTitle.trim()) {
          this.cancelNewRow()
        }
      }, 100)
    }
  }
}
</script>

<!-- Scoped styles for component-specific elements -->
<style scoped>
.notion-table {
  overflow-x: auto;
}

.row-title {
  color: var(--themeColor);
  font-weight: 500;
  cursor: pointer;
}

.row-title:hover {
  text-decoration: underline;
}

.new-page-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-top: 8px;
  color: var(--editorColor50, #999);
  cursor: pointer;
  font-size: 14px;
  transition: color 0.15s ease;
}

.new-page-btn:hover {
  color: var(--themeColor);
}

.new-row-input {
  margin-top: 8px;
  padding: 0 12px;
}

.new-row-title-input {
  width: 100%;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid var(--themeColor);
  border-radius: 4px;
  background: var(--editorBgColor, #fff);
  color: var(--editorColor);
  font-size: 14px;
  outline: none;
}

.new-row-title-input::placeholder {
  color: var(--editorColor50, #999);
}
</style>

<!-- Global styles to hide el-table default sort/filter icons and fix header cell sizing -->
<style>
.notion-table .el-table thead .caret-wrapper {
  display: none !important;
}

.notion-table .el-table__column-filter-trigger {
  display: none !important;
}

.notion-table .el-table th {
  padding: 0 !important;
  position: relative;
}

.notion-table .el-table th .cell {
  padding: 0 !important;
  height: 100%;
  display: flex;
  align-items: stretch;
}

.notion-table .el-table th .cell > * {
  flex: 1;
  display: flex;
  align-items: center;
}

/* Wider column resize handle for easier clicking */
.notion-table .el-table th.is-leaf::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: col-resize;
  z-index: 10;
}

/* Prevent table from auto-distributing column widths */
.notion-table .el-table__header {
  table-layout: fixed;
}

.notion-table .el-table__body {
  table-layout: fixed;
}

/* Ensure table doesn't auto-fit to container width */
.notion-table .el-table {
  width: fit-content !important;
}

.notion-table .el-table__header-wrapper,
.notion-table .el-table__body-wrapper {
  width: fit-content;
}

/* Row styling - grab cursor to indicate draggable */
.notion-table .el-table__body tr {
  cursor: grab;
}

.notion-table .el-table__body tr:active {
  cursor: grabbing;
}

/* Disable default el-table hover effect */
.notion-table .el-table__body tr:hover > td {
  background: transparent !important;
}

/* SortableJS drag styles */
.notion-table .sortable-ghost {
  opacity: 0.4;
  background: var(--themeColor) !important;
}

.notion-table .sortable-ghost > td {
  background: var(--themeColor) !important;
}

.notion-table .sortable-chosen {
  background: var(--floatHoverColor, #f5f5f5) !important;
}

.notion-table .sortable-chosen > td {
  background: var(--floatHoverColor, #f5f5f5) !important;
}
</style>
