<template>
  <div class="database-inline-view">
    <div class="database-header">
      <div class="database-title">
        <h1 v-if="currentDatabase">{{ currentDatabase.name }}</h1>
        <h1 v-else>Loading...</h1>
      </div>
    </div>

    <div class="database-content">
      <database-table-adapter
        v-if="databaseId && (pages.length > 0 || properties.length > 0)"
        :database-id="databaseId"
        @open-page="handleOpenPage"
      />
      <div v-else-if="loading" class="loading-state">
        <i class="el-icon-loading"></i>
        <span>Loading pages...</span>
      </div>
      <div v-else class="empty-state">
        <p>No pages found in this database.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import DatabaseTableAdapter from './DatabaseTableAdapter'

/** Inline database view displayed in main content area */
export default {
  name: 'DatabaseInlineView',
  components: {
    DatabaseTableAdapter
  },

  props: {
    folderPath: {
      type: String,
      required: true
    }
  },

  data () {
    return {
      databaseId: null
    }
  },

  computed: {
    ...mapState({
      currentDatabase: state => state.database.currentDatabase,
      pages: state => state.database.pages,
      properties: state => state.database.properties,
      loading: state => state.database.loading,
      error: state => state.database.error,
      databases: state => state.database.databases
    })
  },

  watch: {
    folderPath: {
      immediate: true,
      async handler (newPath) {
        if (newPath) {
          await this.loadDatabaseForFolder(newPath)
        }
      }
    }
  },

  methods: {
    ...mapActions([
      'FETCH_DATABASES',
      'FETCH_DATABASE',
      'FETCH_PAGES',
      'FETCH_PROPERTIES'
    ]),

    async loadDatabaseForFolder (folderPath) {
      console.log('[DB View] Loading database for folder:', folderPath)
      await this.FETCH_DATABASES()
      console.log('[DB View] All databases:', this.databases)
      const db = this.databases.find(d => d.folderPath === folderPath)
      console.log('[DB View] Found db:', db)
      if (db) {
        this.databaseId = db.id
        await this.FETCH_DATABASE(db.id)
        await Promise.all([
          this.FETCH_PAGES(db.id),
          this.FETCH_PROPERTIES(db.id)
        ])
        console.log('[DB View] Loaded pages:', this.pages, 'properties:', this.properties)
      } else {
        console.log('[DB View] No database found for folder path')
      }
    },

    handleOpenPage (page) {
      this.$emit('open-page', page)
    }
  }
}
</script>

<style scoped>
.database-inline-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--editorBgColor);
  color: var(--editorColor);
}

.database-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--floatBorderColor);
  background: var(--floatBgColor);
  flex-shrink: 0;
}

.database-header .database-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.database-content {
  flex: 1;
  padding: 24px;
  overflow: auto;
  box-sizing: border-box;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--editorColor50);
}

.loading-state i {
  font-size: 32px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 16px;
}
</style>
