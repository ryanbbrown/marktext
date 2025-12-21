<template>
  <div class="column-header" @click.stop="showMenu($event)">
    <span class="column-name">{{ column.name }}</span>
    <span v-if="currentSort" class="sort-indicator">
      <i :class="currentSort === 'asc' ? 'el-icon-top' : 'el-icon-bottom'" />
    </span>
  </div>
</template>

<script>
export default {
  name: 'ColumnHeaderMenu',

  props: {
    column: {
      type: Object,
      required: true
    },
    isFirst: {
      type: Boolean,
      default: false
    },
    isLast: {
      type: Boolean,
      default: false
    },
    /** Whether this column can be hidden (all except Title) */
    canHide: {
      type: Boolean,
      default: true
    },
    /** Current sort direction: 'asc', 'desc', or null */
    currentSort: {
      type: String,
      default: null
    }
  },

  data () {
    return {
      menu: null
    }
  },

  mounted () {
    document.addEventListener('column-menu-open', this.handleOtherMenuOpen)
  },

  beforeDestroy () {
    document.removeEventListener('column-menu-open', this.handleOtherMenuOpen)
    this.removeMenu()
  },

  methods: {
    handleOtherMenuOpen (e) {
      if (e.detail !== this._uid) {
        this.removeMenu()
      }
    },

    showMenu (event) {
      // Close any other open column menus
      document.dispatchEvent(new CustomEvent('column-menu-open', { detail: this._uid }))
      this.removeMenu()

      const headerCell = event.currentTarget.closest('th') || event.currentTarget
      const rect = headerCell.getBoundingClientRect()

      this.menu = document.createElement('div')
      this.menu.className = 'column-context-menu'
      this.menu.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 4}px;
        left: ${rect.left}px;
        background: var(--floatBgColor, #fff);
        border: 1px solid var(--floatBorderColor, #ddd);
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        min-width: 160px;
        z-index: 9999;
        padding: 4px 0;
      `

      // Sort section
      this.addSectionLabel('Sort')
      this.addMenuItem({
        label: 'Ascending',
        icon: 'el-icon-top',
        action: 'sort-asc',
        active: this.currentSort === 'asc'
      })
      this.addMenuItem({
        label: 'Descending',
        icon: 'el-icon-bottom',
        action: 'sort-desc',
        active: this.currentSort === 'desc'
      })
      if (this.currentSort) {
        this.addMenuItem({
          label: 'Clear sort',
          icon: 'el-icon-close',
          action: 'sort-clear'
        })
      }

      // Insert column options (available for all columns)
      this.addDivider()
      this.addMenuItem({ label: 'Insert left', icon: 'el-icon-plus', action: 'insert-left' })
      this.addMenuItem({ label: 'Insert right', icon: 'el-icon-plus', action: 'insert-right' })

      // Move options (available for all columns)
      this.addDivider()
      this.addMenuItem({ label: 'Move Left', icon: 'el-icon-back', action: 'move-left', disabled: this.isFirst })
      this.addMenuItem({ label: 'Move Right', icon: 'el-icon-right', action: 'move-right', disabled: this.isLast })

      // Hide option (for all columns except Title)
      if (this.canHide) {
        this.addMenuItem({ label: 'Hide', icon: 'el-icon-view', action: 'hide' })
      }

      // Edit/Delete options (only for custom property columns)
      if (!this.column.isBuiltIn) {
        this.addDivider()
        this.addMenuItem({ label: 'Rename', icon: 'el-icon-edit', action: 'edit' })
        this.addMenuItem({ label: 'Delete', icon: 'el-icon-delete', action: 'delete', danger: true })
      }

      document.body.appendChild(this.menu)

      setTimeout(() => {
        document.addEventListener('click', this.removeMenu)
      }, 0)
    },

    addSectionLabel (text) {
      const label = document.createElement('div')
      label.style.cssText = `
        padding: 4px 12px;
        font-size: 11px;
        font-weight: 600;
        color: var(--editorColor50, #999);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `
      label.textContent = text
      this.menu.appendChild(label)
    },

    addDivider () {
      const divider = document.createElement('div')
      divider.style.cssText = 'height: 1px; background: var(--floatBorderColor, #ddd); margin: 4px 0;'
      this.menu.appendChild(divider)
    },

    addMenuItem (item) {
      const menuItem = document.createElement('div')
      const hasIcon = item.icon && item.icon.length > 0
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: ${item.danger ? '#f56c6c' : 'var(--editorColor, #333)'};
        opacity: ${item.disabled ? '0.4' : '1'};
        background: ${item.active ? 'var(--floatHoverColor, #f5f5f5)' : 'transparent'};
      `

      if (hasIcon) {
        menuItem.innerHTML = `<i class="${item.icon}" style="width: 14px;"></i> ${item.label}`
      } else {
        menuItem.innerHTML = `<span style="width: 14px;"></span> ${item.label}`
      }

      if (!item.disabled) {
        menuItem.onmouseenter = () => { menuItem.style.background = 'var(--floatHoverColor, #f5f5f5)' }
        menuItem.onmouseleave = () => { menuItem.style.background = item.active ? 'var(--floatHoverColor, #f5f5f5)' : 'transparent' }
        menuItem.onclick = (e) => {
          e.stopPropagation()
          this.handleAction(item.action)
        }
      }

      this.menu.appendChild(menuItem)
    },

    removeMenu () {
      if (this.menu && this.menu.parentNode) {
        this.menu.parentNode.removeChild(this.menu)
        this.menu = null
      }
      document.removeEventListener('click', this.removeMenu)
    },

    handleAction (action) {
      this.removeMenu()

      if (action === 'sort-asc') {
        this.$emit('sort', { columnId: this.column.id, direction: 'asc' })
      } else if (action === 'sort-desc') {
        this.$emit('sort', { columnId: this.column.id, direction: 'desc' })
      } else if (action === 'sort-clear') {
        this.$emit('sort', { columnId: this.column.id, direction: null })
      } else if (action === 'edit') {
        this.$emit('edit', this.column)
      } else if (action === 'delete') {
        this.$emit('delete', this.column.id)
      } else if (action === 'hide') {
        this.$emit('hide', this.column.id)
      } else if (action === 'move-left') {
        this.$emit('move', { column: this.column, direction: -1 })
      } else if (action === 'move-right') {
        this.$emit('move', { column: this.column, direction: 1 })
      } else if (action === 'insert-left') {
        this.$emit('insert', { column: this.column, direction: 'left' })
      } else if (action === 'insert-right') {
        this.$emit('insert', { column: this.column, direction: 'right' })
      }
    }
  }
}
</script>

<style scoped>
.column-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 10px 12px;
  transition: background-color 0.15s ease;
}

.column-header:hover {
  background: var(--floatHoverColor, rgba(0, 0, 0, 0.05));
}

.column-name {
  font-weight: 600;
  flex: 1;
}

.sort-indicator {
  font-size: 12px;
  color: var(--themeColor);
}
</style>
