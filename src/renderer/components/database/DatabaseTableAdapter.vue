<template>
  <notion-table
    :rows="rows"
    :columns="columns"
    :column-order="columnOrder"
    :column-widths="columnWidths"
    @row-open="$emit('open-page', $event)"
    @row-create="handleRowCreate"
    @cell-change="handleCellChange"
    @column-create="handleColumnCreate"
    @column-update="handleColumnUpdate"
    @column-delete="handleColumnDelete"
    @column-order-change="handleColumnOrderChange"
    @rows-reorder="handleRowsReorder"
    @column-resize="handleColumnResize"
  />
</template>

<script>
import { mapState, mapActions } from 'vuex'
import { NotionTable } from '@/components/notion-table'

export default {
  name: 'DatabaseTableAdapter',

  components: {
    NotionTable
  },

  props: {
    databaseId: {
      type: String,
      required: true
    }
  },

  computed: {
    ...mapState({
      pages: state => state.database.pages,
      properties: state => state.database.properties,
      currentDatabase: state => state.database.currentDatabase
    }),

    /** Map pages to NotionTable row format */
    rows () {
      return this.pages.map(page => ({
        id: page.id,
        title: page.title,
        filePath: page.filePath,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        values: page.properties || {}
      }))
    },

    /** Map properties to NotionTable column format */
    columns () {
      return this.properties.map(prop => ({
        id: prop.id,
        name: prop.name,
        type: prop.type,
        config: prop.config
      }))
    },

    /** Get column order from current database */
    columnOrder () {
      return this.currentDatabase?.columnOrder || ['title', 'createdAt', 'updatedAt']
    },

    /** Get column widths from current database */
    columnWidths () {
      return this.currentDatabase?.columnWidths || {}
    }
  },

  methods: {
    ...mapActions([
      'CREATE_PROPERTY',
      'UPDATE_PROPERTY',
      'DELETE_PROPERTY',
      'SET_PAGE_PROPERTY',
      'REORDER_PAGES',
      'UPDATE_COLUMN_ORDER',
      'UPDATE_COLUMN_WIDTHS',
      'CREATE_PAGE'
    ]),

    handleCellChange ({ rowId, columnId, value }) {
      this.SET_PAGE_PROPERTY({
        pageId: rowId,
        propertyId: columnId,
        value
      })
    },

    async handleRowCreate ({ title }) {
      await this.CREATE_PAGE({
        databaseId: this.databaseId,
        title
      })
    },

    async handleColumnCreate ({ name, type, config, insertIndex }) {
      await this.CREATE_PROPERTY({
        databaseId: this.databaseId,
        name,
        type,
        config,
        insertIndex
      })
    },

    async handleColumnUpdate ({ columnId, updates }) {
      await this.UPDATE_PROPERTY({
        propertyId: columnId,
        updates
      })
    },

    async handleColumnDelete (columnId) {
      try {
        await this.$confirm('Are you sure you want to delete this column?', 'Warning', {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning'
        })
        await this.DELETE_PROPERTY(columnId)
      } catch (e) {
        // User cancelled
      }
    },

    handleColumnOrderChange (columnOrder) {
      this.UPDATE_COLUMN_ORDER(columnOrder)
    },

    handleRowsReorder (rowIds) {
      this.REORDER_PAGES(rowIds)
    },

    handleColumnResize (columnWidths) {
      this.UPDATE_COLUMN_WIDTHS(columnWidths)
    }
  }
}
</script>
