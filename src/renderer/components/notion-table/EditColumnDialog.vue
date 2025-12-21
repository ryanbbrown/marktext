<template>
  <el-dialog
    title="Edit Column"
    :visible="visible"
    width="400px"
    @close="handleClose"
  >
    <el-form v-if="column" :model="form" label-position="top">
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
      <el-button type="primary" :disabled="!isValid" @click="handleSave">
        Save
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'EditColumnDialog',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    column: {
      type: Object,
      default: null
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

  watch: {
    column: {
      immediate: true,
      handler (col) {
        if (col) {
          this.form = {
            name: col.name,
            type: col.type,
            options: col.config?.options?.slice() || ['']
          }
        }
      }
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
      this.$emit('update:visible', false)
    },

    handleSave () {
      const updates = {
        name: this.form.name.trim(),
        type: this.form.type
      }

      if (this.form.type === 'select') {
        updates.config = { options: this.form.options.filter(o => o.trim()) }
      } else {
        updates.config = null
      }

      this.$emit('save', {
        columnId: this.column.id,
        updates
      })
    }
  }
}
</script>

<style scoped>
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
