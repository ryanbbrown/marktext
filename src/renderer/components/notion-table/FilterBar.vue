<template>
  <div class="filter-bar">
    <div class="filter-chips">
      <div
        v-for="col in allColumns"
        :key="col.id"
        class="filter-chip"
        :class="{ active: hasFilter(col.id) }"
        @click="openFilterModal(col, $event)"
      >
        <span class="chip-label">{{ getChipLabel(col) }}</span>
        <i
          v-if="hasFilter(col.id)"
          class="el-icon-close chip-clear"
          @click.stop="clearFilter(col.id)"
        />
      </div>
    </div>

    <div v-if="hasAnyFilter" class="clear-all" @click="clearAllFilters">
      Clear all
    </div>

    <filter-modal
      :visible.sync="modalVisible"
      :column="editingColumn"
      :value="editingColumn ? filters[editingColumn.id] : null"
      :anchor-el="anchorEl"
      @apply="applyFilter"
    />
  </div>
</template>

<script>
import FilterModal from './FilterModal.vue'

export default {
  name: 'FilterBar',

  components: {
    FilterModal
  },

  props: {
    /** All columns including fixed ones (title, createdAt, updatedAt) and custom columns */
    columns: {
      type: Array,
      required: true
    },
    /** Current filter state: { [columnId]: FilterConfig } */
    filters: {
      type: Object,
      default: () => ({})
    }
  },

  data () {
    return {
      modalVisible: false,
      editingColumn: null,
      anchorEl: null
    }
  },

  computed: {
    /** Columns already include built-in columns from parent */
    allColumns () {
      return this.columns
    },

    hasAnyFilter () {
      return Object.keys(this.filters).length > 0
    }
  },

  methods: {
    hasFilter (columnId) {
      const filter = this.filters[columnId]
      if (!filter) return false
      if (filter.type === 'select' && Array.isArray(filter.values)) {
        return filter.values.length > 0
      }
      return filter.value !== undefined && filter.value !== null && filter.value !== ''
    },

    getChipLabel (col) {
      const filter = this.filters[col.id]
      if (!filter) return col.name

      if (filter.type === 'text') {
        const op = filter.operator === 'contains' ? 'contains' : 'doesn\'t contain'
        const val = this.truncate(filter.value, 15)
        return `${col.name} ${op} "${val}"`
      }

      if (filter.type === 'select' && Array.isArray(filter.values)) {
        if (filter.values.length === 1) {
          return `${col.name} is ${this.truncate(filter.values[0], 15)}`
        }
        return `${col.name} is ${filter.values.length} options`
      }

      if (filter.type === 'checkbox') {
        if (filter.values.length === 1) {
          return `${col.name} is ${filter.values[0] ? 'checked' : 'unchecked'}`
        }
        return `${col.name} is any`
      }

      if (filter.type === 'date') {
        const ops = { eq: 'is', before: 'is before', after: 'is after' }
        const op = ops[filter.operator] || 'is'
        const date = new Date(filter.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return `${col.name} ${op} ${date}`
      }

      if (filter.type === 'number') {
        const ops = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤' }
        const op = ops[filter.operator] || '='
        return `${col.name} ${op} ${filter.value}`
      }

      return col.name
    },

    truncate (str, maxLen) {
      if (!str) return ''
      if (str.length <= maxLen) return str
      return str.slice(0, maxLen) + '...'
    },

    openFilterModal (column, event) {
      this.anchorEl = event.currentTarget
      this.editingColumn = column
      this.modalVisible = true
    },

    applyFilter ({ columnId, filter }) {
      this.$emit('filter-change', { columnId, filter })
    },

    clearFilter (columnId) {
      this.$emit('filter-change', { columnId, filter: null })
    },

    clearAllFilters () {
      this.$emit('clear-all')
    }
  }
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  background: var(--sideBarBgColor, #f5f5f5);
  border: 1px solid var(--floatBorderColor, #ddd);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-chip:hover {
  background: var(--floatHoverColor, #eee);
}

.filter-chip.active {
  background: var(--themeColor);
  border-color: var(--themeColor);
  color: #fff;
}

.chip-label {
  font-weight: 500;
  white-space: nowrap;
}

.chip-clear {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.7;
}

.chip-clear:hover {
  opacity: 1;
}

.clear-all {
  font-size: 12px;
  color: var(--themeColor);
  cursor: pointer;
  white-space: nowrap;
}

.clear-all:hover {
  text-decoration: underline;
}
</style>
