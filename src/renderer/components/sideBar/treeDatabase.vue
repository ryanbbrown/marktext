<template>
  <div
    class="side-bar-database"
    :style="{'padding-left': `${(depth * 20) + 20}px`}"
    :class="[{ 'active': isActive }]"
    :title="folder.pathname"
    @click="handleClick"
    ref="database"
  >
    <svg class="icon" aria-hidden="true">
      <use xlink:href="#icon-table"></use>
    </svg>
    <span class="text-overflow">{{ folder.name }}</span>
    <span class="badge">DB</span>
  </div>
</template>

<script>
import { mapState } from 'vuex'

/** Database tree node for folders containing database.sqlite */
export default {
  name: 'tree-database',
  props: {
    folder: {
      type: Object,
      required: true
    },
    depth: {
      type: Number,
      required: true
    },
    databaseInfo: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile,
      activeItem: state => state.project.activeItem
    }),
    isActive () {
      return (this.currentFile?.type === 'database' && this.currentFile?.folderPath === this.databaseInfo.folderPath) ||
        this.folder.id === this.activeItem.id
    }
  },
  methods: {
    handleClick () {
      this.$store.dispatch('OPEN_DATABASE_TAB', {
        folderPath: this.databaseInfo.folderPath,
        databaseId: this.databaseInfo.id,
        filename: this.folder.name
      })
    }
  }
}
</script>

<style scoped>
.side-bar-database {
  display: flex;
  position: relative;
  align-items: center;
  cursor: default;
  user-select: none;
  height: 30px;
  box-sizing: border-box;
  padding-right: 15px;
  &:hover {
    background: var(--sideBarItemHoverBgColor);
  }
  & > .icon {
    flex-shrink: 0;
    color: var(--themeColor);
    margin-right: 5px;
  }
  & > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &::before {
    content: '';
    position: absolute;
    display: block;
    left: 0;
    background: var(--themeColor);
    width: 2px;
    height: 0;
    top: 50%;
    transform: translateY(-50%);
    transition: all .2s ease;
  }
}
.side-bar-database.active::before {
  height: 100%;
}
.side-bar-database.active > span:not(.badge) {
  color: var(--themeColor);
}
.badge {
  margin-left: auto;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  background: var(--themeColor);
  color: var(--editorBgColor);
  border-radius: 3px;
  flex-shrink: 0;
}
</style>
