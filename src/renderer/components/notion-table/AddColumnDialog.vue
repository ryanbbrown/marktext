<template>
  <el-dialog
    title="Add Column"
    :visible="visible"
    width="400px"
    @close="handleClose"
  >
    <!-- Hidden built-in columns section -->
    <div v-if="hiddenBuiltInColumns.length > 0" class="restore-section">
      <div class="restore-label">Restore hidden column</div>
      <div class="restore-buttons">
        <el-button
          v-for="col in hiddenBuiltInColumns"
          :key="col.id"
          size="small"
          @click="handleRestore(col.id)"
        >
          {{ col.name }}
        </el-button>
      </div>
      <el-divider>or create new</el-divider>
    </div>

    <el-form :model="form" label-position="top">
      <el-form-item label="Name">
        <el-input v-model="form.name" placeholder="Column name" />
      </el-form-item>

      <el-form-item label="Type">
        <el-select v-model="form.type" placeholder="Select type" style="width: 100%">
          <el-option
            v-for="opt in typeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item v-if="form.type === 'select'" label="Options">
        <div class="select-options">
          <div v-for="(opt, index) in form.options" :key="index" class="option-row">
            <el-input v-model="form.options[index]" size="small" />
            <el-button
              type="text"
              icon="el-icon-delete"
              @click="removeOption(index)"
            />
          </div>
          <el-button type="text" icon="el-icon-plus" @click="addOption">
            Add option
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Cancel</el-button>
      <el-button type="primary" :disabled="!isValid" @click="handleCreate">
        Create
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'AddColumnDialog',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    /** Built-in columns that are currently hidden and can be restored */
    hiddenBuiltInColumns: {
      type: Array,
      default: () => []
    }
  },

  data () {
    return {
      form: {
        name: '',
        type: 'text',
        options: ['']
      },
      typeOptions: [
        { value: 'text', label: 'Text' },
        { value: 'text-eltable', label: 'Text (el-table)' },
        { value: 'number', label: 'Number' },
        { value: 'select', label: 'Select' },
        { value: 'date', label: 'Date' },
        { value: 'checkbox', label: 'Checkbox' }
      ]
    }
  },

  computed: {
    isValid () {
      if (!this.form.name.trim()) return false
      if (this.form.type === 'select') {
        return this.form.options.some(o => o.trim())
      }
      return true
    }
  },

  methods: {
    addOption () {
      this.form.options.push('')
    },

    removeOption (index) {
      if (this.form.options.length > 1) {
        this.form.options.splice(index, 1)
      }
    },

    handleClose () {
      this.resetForm()
      this.$emit('update:visible', false)
    },

    handleCreate () {
      const config = this.form.type === 'select'
        ? { options: this.form.options.filter(o => o.trim()) }
        : null

      this.$emit('create', {
        name: this.form.name.trim(),
        type: this.form.type,
        config
      })
      this.resetForm()
    },

    handleRestore (columnId) {
      this.$emit('restore', columnId)
      this.$emit('update:visible', false)
    },

    resetForm () {
      this.form = {
        name: '',
        type: 'text',
        options: ['']
      }
    }
  }
}
</script>

<style scoped>
.restore-section {
  margin-bottom: 8px;
}

.restore-label {
  font-size: 13px;
  color: var(--editorColor50, #666);
  margin-bottom: 8px;
}

.restore-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.select-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-row .el-input {
  flex: 1;
}
</style>
