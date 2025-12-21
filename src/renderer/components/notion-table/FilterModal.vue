<template>
  <div v-if="visible && column" ref="dropdown" class="filter-dropdown" :style="dropdownStyle">
    <div class="filter-header">
      <span class="filter-title">{{ column.name }} {{ operatorLabel }}</span>
    </div>

    <!-- Text filter (text columns, title) -->
    <div v-if="isTextType" class="filter-body">
      <div class="operator-row">
        <el-select v-model="textOperator" size="small" class="operator-select" popper-class="filter-dropdown-popper">
          <el-option label="contains" value="contains" />
          <el-option label="does not contain" value="not_contains" />
        </el-select>
      </div>
      <el-input
        v-model="textValue"
        size="small"
        placeholder="Enter text..."
        class="value-input"
        @keyup.enter.native="applyFilter"
      />
    </div>

    <!-- Select filter (multi-select options) -->
    <div v-else-if="isSelectType" class="filter-body">
      <div class="select-options">
        <div
          v-for="opt in selectOptions"
          :key="opt"
          class="select-option"
          @click="toggleOption(opt)"
        >
          <span class="option-checkbox">
            <i v-if="selectedOptions.includes(opt)" class="el-icon-check" />
          </span>
          <span class="option-label">{{ opt }}</span>
        </div>
      </div>
      <div v-if="selectedOptions.length > 0" class="clear-selection" @click="clearSelection">
        Clear selection
      </div>
    </div>

    <!-- Checkbox filter -->
    <div v-else-if="isCheckboxType" class="filter-body">
      <div class="select-options">
        <div class="select-option" @click="toggleCheckboxState(true)">
          <span class="option-checkbox">
            <i v-if="selectedCheckboxStates.includes(true)" class="el-icon-check" />
          </span>
          <span class="option-label">Checked</span>
        </div>
        <div class="select-option" @click="toggleCheckboxState(false)">
          <span class="option-checkbox">
            <i v-if="selectedCheckboxStates.includes(false)" class="el-icon-check" />
          </span>
          <span class="option-label">Unchecked</span>
        </div>
      </div>
      <div v-if="selectedCheckboxStates.length > 0" class="clear-selection" @click="clearSelection">
        Clear selection
      </div>
    </div>

    <!-- Date filter -->
    <div v-else-if="isDateType" class="filter-body">
      <div class="operator-row">
        <el-select v-model="dateOperator" size="small" class="operator-select" popper-class="filter-dropdown-popper">
          <el-option label="is" value="eq" />
          <el-option label="is before" value="before" />
          <el-option label="is after" value="after" />
        </el-select>
      </div>
      <el-date-picker
        v-model="dateValue"
        type="date"
        size="small"
        placeholder="Pick a date"
        class="value-input"
        value-format="timestamp"
        popper-class="filter-dropdown-popper"
      />
    </div>

    <!-- Number filter -->
    <div v-else-if="isNumberType" class="filter-body">
      <div class="operator-row">
        <el-select v-model="numberOperator" size="small" class="operator-select" popper-class="filter-dropdown-popper">
          <el-option label="=" value="eq" />
          <el-option label="≠" value="neq" />
          <el-option label=">" value="gt" />
          <el-option label="≥" value="gte" />
          <el-option label="<" value="lt" />
          <el-option label="≤" value="lte" />
        </el-select>
      </div>
      <el-input-number
        v-model="numberValue"
        size="small"
        placeholder="Enter number..."
        class="value-input"
        :controls="false"
      />
    </div>

    <div v-if="!isSelectType && !isCheckboxType" class="filter-footer">
      <el-button size="mini" @click="handleClose">Cancel</el-button>
      <el-button size="mini" type="primary" @click="applyFilter">Apply</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterModal',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    column: {
      type: Object,
      default: null
    },
    value: {
      type: Object,
      default: null
    },
    anchorEl: {
      type: Object,
      default: null
    }
  },

  data () {
    return {
      textOperator: 'contains',
      textValue: '',
      selectedOptions: [],
      selectedCheckboxStates: [],
      dateOperator: 'eq',
      dateValue: null,
      numberOperator: 'eq',
      numberValue: null,
      dropdownStyle: {}
    }
  },

  computed: {
    isTextType () {
      return this.column?.type === 'text' || this.column?.type === 'text-eltable' || this.column?.id === 'title'
    },
    isSelectType () {
      return this.column?.type === 'select'
    },
    isCheckboxType () {
      return this.column?.type === 'checkbox'
    },
    isDateType () {
      return this.column?.type === 'date' || this.column?.id === 'createdAt' || this.column?.id === 'updatedAt'
    },
    isNumberType () {
      return this.column?.type === 'number'
    },
    selectOptions () {
      return this.column?.config?.options || []
    },
    operatorLabel () {
      if (this.isTextType) return this.textOperator === 'contains' ? 'contains' : 'does not contain'
      if (this.isSelectType || this.isCheckboxType) return 'is'
      if (this.isDateType) {
        const labels = { eq: 'is', before: 'is before', after: 'is after' }
        return labels[this.dateOperator] || 'is'
      }
      if (this.isNumberType) {
        const labels = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤' }
        return labels[this.numberOperator] || '='
      }
      return ''
    }
  },

  watch: {
    visible (val) {
      if (val) {
        this.initFromValue()
        this.$nextTick(() => {
          // Use requestAnimationFrame to ensure layout is complete before positioning
          requestAnimationFrame(() => {
            this.positionDropdown()
          })
          document.addEventListener('click', this.handleOutsideClick)
        })
      } else {
        document.removeEventListener('click', this.handleOutsideClick)
      }
    },
    anchorEl () {
      if (this.visible) {
        this.$nextTick(() => {
          requestAnimationFrame(() => {
            this.positionDropdown()
          })
        })
      }
    },
    column () {
      this.initFromValue()
    },
    // Auto-apply for select/checkbox types
    selectedOptions: {
      handler () {
        if (this.isSelectType) this.applyFilter()
      },
      deep: true
    },
    selectedCheckboxStates: {
      handler () {
        if (this.isCheckboxType) this.applyFilter()
      },
      deep: true
    }
  },

  beforeDestroy () {
    document.removeEventListener('click', this.handleOutsideClick)
  },

  methods: {
    positionDropdown () {
      if (!this.anchorEl) return

      const rect = this.anchorEl.getBoundingClientRect()
      const dropdownWidth = 280

      let left = rect.left
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16
      }

      this.dropdownStyle = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${left}px`,
        zIndex: 9999
      }
    },

    handleOutsideClick (e) {
      if (this.$refs.dropdown && !this.$refs.dropdown.contains(e.target)) {
        // Check if click is on the anchor element (the chip)
        if (this.anchorEl && this.anchorEl.contains(e.target)) return
        this.handleClose()
      }
    },

    initFromValue () {
      this.textOperator = 'contains'
      this.textValue = ''
      this.selectedOptions = []
      this.selectedCheckboxStates = []
      this.dateOperator = 'eq'
      this.dateValue = null
      this.numberOperator = 'eq'
      this.numberValue = null

      if (this.value) {
        if (this.value.type === 'text') {
          this.textOperator = this.value.operator || 'contains'
          this.textValue = this.value.value || ''
        } else if (this.value.type === 'select') {
          this.selectedOptions = [...(this.value.values || [])]
        } else if (this.value.type === 'checkbox') {
          this.selectedCheckboxStates = [...(this.value.values || [])]
        } else if (this.value.type === 'date') {
          this.dateOperator = this.value.operator || 'eq'
          this.dateValue = this.value.value || null
        } else if (this.value.type === 'number') {
          this.numberOperator = this.value.operator || 'eq'
          this.numberValue = this.value.value ?? null
        }
      }
    },

    toggleOption (opt) {
      const idx = this.selectedOptions.indexOf(opt)
      if (idx >= 0) {
        this.selectedOptions.splice(idx, 1)
      } else {
        this.selectedOptions.push(opt)
      }
    },

    toggleCheckboxState (state) {
      const idx = this.selectedCheckboxStates.indexOf(state)
      if (idx >= 0) {
        this.selectedCheckboxStates.splice(idx, 1)
      } else {
        this.selectedCheckboxStates.push(state)
      }
    },

    clearSelection () {
      if (this.isSelectType) {
        this.selectedOptions = []
      } else if (this.isCheckboxType) {
        this.selectedCheckboxStates = []
      }
      this.$emit('apply', { columnId: this.column.id, filter: null })
    },

    handleClose () {
      this.$emit('update:visible', false)
    },

    applyFilter () {
      let filter = null

      if (this.isTextType && this.textValue) {
        filter = { type: 'text', operator: this.textOperator, value: this.textValue }
      } else if (this.isSelectType && this.selectedOptions.length > 0) {
        filter = { type: 'select', values: [...this.selectedOptions] }
      } else if (this.isCheckboxType && this.selectedCheckboxStates.length > 0) {
        filter = { type: 'checkbox', values: [...this.selectedCheckboxStates] }
      } else if (this.isDateType && this.dateValue) {
        filter = { type: 'date', operator: this.dateOperator, value: this.dateValue }
      } else if (this.isNumberType && this.numberValue !== null) {
        filter = { type: 'number', operator: this.numberOperator, value: this.numberValue }
      }

      this.$emit('apply', { columnId: this.column.id, filter })

      // Close for non-multi-select types
      if (!this.isSelectType && !this.isCheckboxType) {
        this.handleClose()
      }
    }
  }
}
</script>

<style scoped>
.filter-dropdown {
  background: var(--floatBgColor, #fff);
  border: 1px solid var(--floatBorderColor, #ddd);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 220px;
  max-width: 320px;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--floatBorderColor, #eee);
}

.filter-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--editorColor, #333);
}

.filter-body {
  padding: 8px;
}

.operator-row {
  margin-bottom: 8px;
}

.operator-select {
  width: 100%;
}

.value-input {
  width: 100%;
}

.select-options {
  max-height: 240px;
  overflow-y: auto;
}

.select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.select-option:hover {
  background: var(--floatHoverColor, #f5f5f5);
}

.option-checkbox {
  width: 18px;
  height: 18px;
  border: 1px solid var(--floatBorderColor, #ddd);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--themeColor);
}

.option-label {
  font-size: 13px;
  color: var(--editorColor, #333);
}

.clear-selection {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--editorColor50, #666);
  cursor: pointer;
  border-top: 1px solid var(--floatBorderColor, #eee);
  margin-top: 4px;
}

.clear-selection:hover {
  color: var(--editorColor, #333);
}

.filter-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--floatBorderColor, #eee);
}
</style>

<style>
.filter-dropdown-popper {
  z-index: 10000 !important;
}
</style>
