<template>
  <div class="database-view">
    <div class="database-header">
      <div class="database-title">
        <h1 v-if="currentDatabase">{{ currentDatabase.name }}</h1>
        <h1 v-else>Loading...</h1>
      </div>
      <div class="database-actions">
        <el-button
          size="small"
          @click="goBack"
        >
          Back to Editor
        </el-button>
      </div>
    </div>

    <div class="database-content">
      <database-table-adapter
        v-if="pages.length > 0 || properties.length > 0"
        :database-id="$route.params.id"
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
import { ipcRenderer } from 'electron'
import { mapState, mapActions } from 'vuex'
import DatabaseTableAdapter from '@/components/database/DatabaseTableAdapter'

export default {
  name: 'Database',
  components: {
    DatabaseTableAdapter
  },

  computed: {
    ...mapState({
      currentDatabase: state => state.database.currentDatabase,
      pages: state => state.database.pages,
      properties: state => state.database.properties,
      loading: state => state.database.loading,
      error: state => state.database.error
    })
  },

  watch: {
    '$route.params.id': {
      immediate: true,
      handler (newId) {
        if (newId) {
          this.loadDatabase(newId)
        }
      }
    }
  },

  methods: {
    ...mapActions([
      'FETCH_DATABASE',
      'FETCH_PAGES',
      'FETCH_PROPERTIES'
    ]),

    async loadDatabase (databaseId) {
      await this.FETCH_DATABASE(databaseId)
      await Promise.all([
        this.FETCH_PAGES(databaseId),
        this.FETCH_PROPERTIES(databaseId)
      ])
    },

    handleOpenPage (page) {
      ipcRenderer.send('mt::open-file', page.filePath, {})
      this.$router.push('/editor')
    },

    goBack () {
      this.$router.push('/editor')
    }
  }
}
</script>

<style scoped>
.database-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--editorBgColor);
  color: var(--editorColor);
}

.database-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  padding-left: 80px; /* Space for Mac traffic light buttons */
  border-bottom: 1px solid var(--floatBorderColor);
  background: var(--floatBgColor);
  -webkit-app-region: drag;
}

.database-header .database-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.database-header .database-actions {
  -webkit-app-region: no-drag;
}

.database-content {
  flex: 1;
  padding: 24px;
  padding-right: 24px;
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
