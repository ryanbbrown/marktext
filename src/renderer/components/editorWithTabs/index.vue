<template>
    <div
      class="editor-with-tabs"
      :style="{'max-width': showSideBar ? `calc(100vw - ${sideBarWidth}px` : '100vw' }"
    >
      <tabs v-show="showTabBar"></tabs>
      <div class="container">
        <database-inline-view
          v-if="isDatabaseTab"
          :folder-path="databaseFolderPath"
          @open-page="handleOpenPage"
        />
        <template v-else>
          <editor
            :markdown="markdown"
            :cursor="cursor"
            :text-direction="textDirection"
            :platform="platform"
          ></editor>
          <source-code
            v-if="sourceCode"
            :markdown="markdown"
            :cursor="cursor"
            :text-direction="textDirection"
          ></source-code>
        </template>
      </div>
      <tab-notifications v-if="!isDatabaseTab"></tab-notifications>
    </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import { mapState } from 'vuex'
import Tabs from './tabs.vue'
import Editor from './editor.vue'
import SourceCode from './sourceCode.vue'
import TabNotifications from './notifications.vue'
import DatabaseInlineView from '../database/DatabaseInlineView.vue'

export default {
  props: {
    markdown: {
      type: String
    },
    cursor: {
      validator (value) {
        return typeof value === 'object'
      }
    },
    sourceCode: {
      type: Boolean,
      required: true
    },
    showTabBar: {
      type: Boolean,
      required: true
    },
    textDirection: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      required: true
    },
    isDatabaseTab: {
      type: Boolean,
      default: false
    },
    databaseFolderPath: {
      type: String,
      default: null
    }
  },
  components: {
    Tabs,
    Editor,
    SourceCode,
    TabNotifications,
    DatabaseInlineView
  },
  computed: {
    ...mapState({
      showSideBar: state => state.layout.showSideBar,
      sideBarWidth: state => state.layout.sideBarWidth
    })
  },
  methods: {
    /** Handle opening a page from the database view. */
    handleOpenPage (page) {
      ipcRenderer.send('mt::open-file', page.filePath, {})
    }
  }
}
</script>

<style scoped>
  .editor-with-tabs {
    position: relative;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;

    overflow: hidden;
    background: var(--editorBgColor);
    & > .container {
      flex: 1;
      overflow: hidden;
    }
  }
</style>
