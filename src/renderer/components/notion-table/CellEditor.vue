<template>
  <div class="cell-editor" @click.stop>
    <!-- Text type -->
    <div
      v-if="column.type === 'text'"
      ref="textCell"
      class="text-cell"
      contenteditable="true"
      @focus="isTextFocused = true"
      @blur="saveText"
      @keydown.enter.prevent="$refs.textCell.blur()"
    />

    <!-- Number type -->
    <el-input-number
      v-else-if="column.type === 'number'"
      v-model="localValue"
      size="mini"
      :controls="false"
      @blur="save"
      @keyup.enter.native="save"
    />

    <!-- Select type -->
    <el-select
      v-else-if="column.type === 'select'"
      v-model="localValue"
      size="mini"
      @change="save"
    >
      <el-option
        v-for="option in selectOptions"
        :key="option"
        :label="option"
        :value="option"
      />
    </el-select>

    <!-- Date type -->
    <el-date-picker
      v-else-if="column.type === 'date'"
      v-model="dateValue"
      type="date"
      size="mini"
      format="MMM d, yyyy"
      @change="saveDate"
    />

    <!-- Checkbox type -->
    <el-checkbox
      v-else-if="column.type === 'checkbox'"
      v-model="checkboxValue"
      @change="saveCheckbox"
    />
  </div>
</template>

<script>
export default {
  name: 'CellEditor',

  props: {
    /** Column definition with type and config */
    column: {
      type: Object,
      required: true
    },
    /** Current cell value */
    value: {
      type: [String, Number, Boolean],
      default: null
    }
  },

  data () {
    return {
      localValue: this.value,
      isTextFocused: false
    }
  },

  mounted () {
    // Set initial text content for contenteditable
    if (this.column.type === 'text' && this.$refs.textCell) {
      this.$refs.textCell.textContent = this.value || ''
    }
  },

  computed: {
    selectOptions () {
      return this.column.config?.options || []
    },
    dateValue: {
      get () {
        return this.value ? new Date(this.value) : null
      },
      set (val) {
        this.localValue = val ? val.getTime() : null
      }
    },
    checkboxValue: {
      get () {
        return this.value === 1 || this.value === true
      },
      set (val) {
        this.localValue = val ? 1 : 0
      }
    }
  },

  watch: {
    value (newVal) {
      this.localValue = newVal
      // Update DOM directly for text cells, but only when not focused
      if (this.column.type === 'text' && !this.isTextFocused && this.$refs.textCell) {
        this.$refs.textCell.textContent = newVal || ''
      }
    }
  },

  methods: {
    save () {
      if (this.localValue !== this.value) {
        this.$emit('change', this.localValue)
      }
    },
    saveText (e) {
      this.isTextFocused = false
      const newValue = e.target.innerText.trim()
      if (newValue !== this.value) {
        this.localValue = newValue
        this.$emit('change', newValue)
      }
    },
    saveDate () {
      this.$emit('change', this.localValue)
    },
    saveCheckbox () {
      this.$emit('change', this.localValue)
    }
  }
}
</script>

<style scoped>
.cell-editor {
  width: 100%;
}

.cell-editor >>> .el-input__inner,
.cell-editor >>> .el-input-number__decrease,
.cell-editor >>> .el-input-number__increase {
  background: transparent;
  border-color: var(--floatBorderColor);
  color: var(--editorColor);
}

/* Text cells: borderless, full-width, wrapping text */
.cell-editor .text-cell {
  padding: 4px 6px;
  color: var(--editorColor);
  font-family: inherit;
  font-size: inherit;
  line-height: 1.4;
  outline: none;
  min-height: 1.4em;
  word-break: break-word;
}

.cell-editor >>> .el-input-number {
  width: 100%;
}

.cell-editor >>> .el-date-editor {
  width: 100%;
}

.cell-editor >>> .el-checkbox__inner {
  background: transparent;
  border-color: var(--floatBorderColor);
}

.cell-editor >>> .el-checkbox__input.is-checked .el-checkbox__inner {
  background: var(--themeColor);
  border-color: var(--themeColor);
}
</style>
