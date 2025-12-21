<template>
  <el-dialog
    :visible="visible"
    :show-close="false"
    :modal="true"
    :fullscreen="true"
    custom-class="page-editor-dialog"
    @close="handleClose"
  >
    <div class="modal-header" slot="title">
      <div class="modal-title">
        <h2>{{ page ? page.title : 'Loading...' }}</h2>
        <span v-if="hasChanges" class="unsaved-indicator">Unsaved changes</span>
      </div>
      <div class="modal-actions">
        <el-button
          type="primary"
          size="small"
          :loading="saving"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          Save
        </el-button>
        <el-button
          size="small"
          @click="handleClose"
        >
          Close
        </el-button>
      </div>
    </div>

    <div class="modal-body">
      <div v-if="loading" class="loading-state">
        <i class="el-icon-loading"></i>
        <span>Loading content...</span>
      </div>
      <div
        v-else
        ref="editorContainer"
        class="editor-container"
      ></div>
    </div>
  </el-dialog>
</template>

<script>
import { mapState } from 'vuex'
import Muya from 'muya/lib'
import TablePicker from 'muya/lib/ui/tablePicker'
import QuickInsert from 'muya/lib/ui/quickInsert'
import CodePicker from 'muya/lib/ui/codePicker'
import EmojiPicker from 'muya/lib/ui/emojiPicker'
import FormatPicker from 'muya/lib/ui/formatPicker'
import LinkTools from 'muya/lib/ui/linkTools'
import FootnoteTool from 'muya/lib/ui/footnoteTool'
import TableBarTools from 'muya/lib/ui/tableTools'
import FrontMenu from 'muya/lib/ui/frontMenu'

import 'muya/themes/default.css'

export default {
  name: 'PageEditorModal',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    page: {
      type: Object,
      default: null
    },
    content: {
      type: String,
      default: ''
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      editor: null,
      currentContent: '',
      hasChanges: false,
      saving: false
    }
  },

  computed: {
    ...mapState({
      preferences: state => state.preferences
    })
  },

  watch: {
    visible (newVal) {
      if (newVal && !this.loading) {
        this.$nextTick(() => {
          this.initEditor()
        })
      } else if (!newVal) {
        this.destroyEditor()
      }
    },
    content (newVal) {
      if (this.visible && !this.loading) {
        this.$nextTick(() => {
          this.initEditor()
        })
      }
    }
  },

  beforeDestroy () {
    this.destroyEditor()
  },

  methods: {
    initEditor () {
      if (this.editor) {
        this.destroyEditor()
      }

      const container = this.$refs.editorContainer
      if (!container) return

      // Register Muya plugins
      Muya.use(TablePicker)
      Muya.use(QuickInsert)
      Muya.use(CodePicker)
      Muya.use(EmojiPicker)
      Muya.use(FormatPicker)
      Muya.use(FrontMenu)
      Muya.use(LinkTools)
      Muya.use(FootnoteTool)
      Muya.use(TableBarTools)

      const {
        preferLooseListItem,
        autoPairBracket,
        autoPairMarkdownSyntax,
        autoPairQuote,
        bulletListMarker,
        orderListDelimiter,
        tabSize,
        fontSize,
        lineHeight,
        listIndentation,
        frontmatterType,
        superSubScript,
        footnote,
        isHtmlEnabled,
        theme
      } = this.preferences

      const options = {
        markdown: this.content,
        preferLooseListItem,
        autoPairBracket,
        autoPairMarkdownSyntax,
        autoPairQuote,
        bulletListMarker,
        orderListDelimiter,
        tabSize,
        fontSize,
        lineHeight,
        listIndentation,
        frontmatterType,
        superSubScript,
        footnote,
        disableHtml: !isHtmlEnabled
      }

      // Set theme-specific options
      if (/dark/i.test(theme)) {
        Object.assign(options, {
          mermaidTheme: 'dark',
          vegaTheme: 'dark'
        })
      } else {
        Object.assign(options, {
          mermaidTheme: 'default',
          vegaTheme: 'latimes'
        })
      }

      this.editor = new Muya(container, options)
      this.currentContent = this.content
      this.hasChanges = false

      // Listen for content changes
      this.editor.on('change', changes => {
        this.currentContent = changes.markdown
        this.hasChanges = this.currentContent !== this.content
      })
    },

    destroyEditor () {
      if (this.editor) {
        this.editor.destroy()
        this.editor = null
      }
      this.hasChanges = false
      this.currentContent = ''
    },

    async handleSave () {
      if (!this.hasChanges) return

      this.saving = true
      try {
        this.$emit('save', this.currentContent)
        this.hasChanges = false
      } finally {
        this.saving = false
      }
    },

    handleClose () {
      if (this.hasChanges) {
        this.$confirm('You have unsaved changes. Are you sure you want to close?', 'Unsaved Changes', {
          confirmButtonText: 'Discard',
          cancelButtonText: 'Cancel',
          type: 'warning'
        }).then(() => {
          this.$emit('close')
        }).catch(() => {
          // User cancelled, do nothing
        })
      } else {
        this.$emit('close')
      }
    }
  }
}
</script>

<style>
.page-editor-dialog {
  display: flex;
  flex-direction: column;
  background: var(--editorBgColor) !important;
}

.page-editor-dialog .el-dialog__header {
  padding: 0;
  border-bottom: 1px solid var(--floatBorderColor);
}

.page-editor-dialog .el-dialog__body {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.page-editor-dialog .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  padding-left: 80px; /* Space for Mac traffic light buttons */
  background: var(--floatBgColor);
}

.page-editor-dialog .modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-editor-dialog .modal-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--editorColor);
}

.page-editor-dialog .unsaved-indicator {
  font-size: 12px;
  color: var(--themeColor);
  background: var(--floatHoverColor);
  padding: 2px 8px;
  border-radius: 4px;
}

.page-editor-dialog .modal-actions {
  display: flex;
  gap: 8px;
}

.page-editor-dialog .modal-body {
  height: calc(100vh - 70px);
  overflow: hidden;
}

.page-editor-dialog .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--editorColor50);
}

.page-editor-dialog .loading-state i {
  font-size: 32px;
  margin-bottom: 16px;
}

.page-editor-dialog .editor-container {
  height: 100%;
  padding: 20px 60px;
  overflow-y: auto;
  overflow-x: hidden;
}

.page-editor-dialog .editor-container .ag-paragraph {
  color: var(--editorColor);
}
</style>
