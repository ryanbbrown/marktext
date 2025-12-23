import { ipcRenderer } from 'electron'

const state = {
  databases: [],
  currentDatabase: null,
  pages: [],
  properties: [],
  currentPage: null,
  pageContent: '',
  loading: false,
  error: null
}

const getters = {
  getDatabaseById: (state) => (id) => {
    return state.databases.find(db => db.id === id)
  },
  getPageById: (state) => (id) => {
    return state.pages.find(page => page.id === id)
  }
}

const mutations = {
  SET_DATABASES (state, databases) {
    state.databases = databases
  },
  SET_CURRENT_DATABASE (state, database) {
    state.currentDatabase = database
  },
  SET_PAGES (state, pages) {
    state.pages = pages
  },
  SET_PROPERTIES (state, properties) {
    state.properties = properties
  },
  ADD_PROPERTY (state, property) {
    state.properties.push(property)
  },
  UPDATE_PROPERTY (state, { propertyId, updates }) {
    const prop = state.properties.find(p => p.id === propertyId)
    if (prop) Object.assign(prop, updates)
  },
  REMOVE_PROPERTY (state, propertyId) {
    const index = state.properties.findIndex(p => p.id === propertyId)
    if (index !== -1) state.properties.splice(index, 1)
  },
  SET_CURRENT_PAGE (state, page) {
    state.currentPage = page
  },
  SET_PAGE_CONTENT (state, content) {
    state.pageContent = content
  },
  SET_LOADING (state, loading) {
    state.loading = loading
  },
  SET_ERROR (state, error) {
    state.error = error
  },
  SET_PAGE_PROPERTY (state, { pageId, propertyId, value }) {
    const page = state.pages.find(p => p.id === pageId)
    if (page) {
      if (!page.properties) page.properties = {}
      page.properties[propertyId] = value
      page.updatedAt = Date.now()
    }
  },
  UPDATE_PAGE_IN_LIST (state, updatedPage) {
    const index = state.pages.findIndex(p => p.id === updatedPage.id)
    if (index !== -1) {
      state.pages.splice(index, 1, { ...state.pages[index], ...updatedPage })
    }
  },
  SET_COLUMN_WIDTHS (state, columnWidths) {
    if (state.currentDatabase) {
      state.currentDatabase.columnWidths = columnWidths
    }
  },
  SET_COLUMN_ORDER (state, columnOrder) {
    if (state.currentDatabase) {
      state.currentDatabase.columnOrder = columnOrder
    }
  }
}

const actions = {
  async FETCH_DATABASES ({ commit }) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    try {
      const result = await ipcRenderer.invoke('mt::database-get-all')
      if (result.success) {
        commit('SET_DATABASES', result.data)
      } else {
        commit('SET_ERROR', result.error)
      }
    } catch (err) {
      commit('SET_ERROR', err.message)
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async FETCH_DATABASE ({ commit }, databaseId) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    try {
      const result = await ipcRenderer.invoke('mt::database-get', databaseId)
      if (result.success) {
        commit('SET_CURRENT_DATABASE', result.data)
      } else {
        commit('SET_ERROR', result.error)
      }
    } catch (err) {
      commit('SET_ERROR', err.message)
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async FETCH_PAGES ({ commit }, databaseId) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    try {
      const result = await ipcRenderer.invoke('mt::database-get-pages', databaseId)
      if (result.success) {
        commit('SET_PAGES', result.data)
      } else {
        commit('SET_ERROR', result.error)
      }
    } catch (err) {
      commit('SET_ERROR', err.message)
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async CREATE_PAGE ({ commit, state }, { databaseId, title }) {
    try {
      const result = await ipcRenderer.invoke('mt::database-create-page', databaseId, title)
      if (result.success) {
        // Add the new page to state
        commit('SET_PAGES', [...state.pages, result.data])
      }
      return result
    } catch (err) {
      console.error('Failed to create page:', err)
      return { success: false, error: err.message }
    }
  },

  async LOAD_PAGE_CONTENT ({ commit }, pageId) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    try {
      const result = await ipcRenderer.invoke('mt::database-get-page-content', pageId)
      if (result.success) {
        commit('SET_CURRENT_PAGE', result.data)
        commit('SET_PAGE_CONTENT', result.data.content || '')
      } else {
        commit('SET_ERROR', result.error)
      }
    } catch (err) {
      commit('SET_ERROR', err.message)
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async SAVE_PAGE_CONTENT ({ commit, state }, { pageId, content }) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    try {
      const result = await ipcRenderer.invoke('mt::database-save-page', pageId, content)
      if (result.success) {
        commit('SET_PAGE_CONTENT', content)
        // Update the page's updatedAt in the list
        commit('UPDATE_PAGE_IN_LIST', { id: pageId, updatedAt: Date.now() })
      } else {
        commit('SET_ERROR', result.error)
      }
      return result.success
    } catch (err) {
      commit('SET_ERROR', err.message)
      return false
    } finally {
      commit('SET_LOADING', false)
    }
  },

  CLEAR_CURRENT_PAGE ({ commit }) {
    commit('SET_CURRENT_PAGE', null)
    commit('SET_PAGE_CONTENT', '')
  },

  // ==================== Property Actions ====================

  async FETCH_PROPERTIES ({ commit }, databaseId) {
    try {
      const result = await ipcRenderer.invoke('mt::database-get-properties', databaseId)
      if (result.success) {
        commit('SET_PROPERTIES', result.data)
      }
      return result.success
    } catch (err) {
      console.error('Failed to fetch properties:', err)
      return false
    }
  },

  async CREATE_PROPERTY ({ commit }, { databaseId, name, type, config, insertIndex }) {
    try {
      const result = await ipcRenderer.invoke('mt::database-create-property', databaseId, name, type, config, insertIndex)
      if (result.success) {
        // Backend returns { property, columnOrder } atomically
        commit('ADD_PROPERTY', result.data.property)
        commit('SET_COLUMN_ORDER', result.data.columnOrder)
      }
      return result
    } catch (err) {
      console.error('Failed to create property:', err)
      return { success: false, error: err.message }
    }
  },

  async UPDATE_PROPERTY ({ commit }, { propertyId, updates }) {
    try {
      const result = await ipcRenderer.invoke('mt::database-update-property', propertyId, updates)
      if (result.success) {
        commit('UPDATE_PROPERTY', { propertyId, updates })
      }
      return result.success
    } catch (err) {
      console.error('Failed to update property:', err)
      return false
    }
  },

  async DELETE_PROPERTY ({ commit }, propertyId) {
    try {
      const result = await ipcRenderer.invoke('mt::database-delete-property', propertyId)
      if (result.success) {
        // Backend returns { columnOrder } atomically
        commit('REMOVE_PROPERTY', propertyId)
        commit('SET_COLUMN_ORDER', result.data.columnOrder)
      }
      return result.success
    } catch (err) {
      console.error('Failed to delete property:', err)
      return false
    }
  },

  async UPDATE_COLUMN_ORDER ({ commit, state }, columnOrder) {
    if (!state.currentDatabase) return false
    try {
      const result = await ipcRenderer.invoke('mt::database-update-column-order', state.currentDatabase.id, columnOrder)
      if (result.success) {
        commit('SET_COLUMN_ORDER', columnOrder)
      }
      return result.success
    } catch (err) {
      console.error('Failed to update column order:', err)
      return false
    }
  },

  async SET_PAGE_PROPERTY ({ commit }, { pageId, propertyId, value }) {
    try {
      const result = await ipcRenderer.invoke('mt::database-set-page-property', pageId, propertyId, value)
      if (result.success) {
        commit('SET_PAGE_PROPERTY', { pageId, propertyId, value })
      }
      return result.success
    } catch (err) {
      console.error('Failed to set page property:', err)
      return false
    }
  },

  async REORDER_PAGES ({ commit, state }, pageIds) {
    try {
      const result = await ipcRenderer.invoke('mt::database-reorder-pages', pageIds)
      if (result.success) {
        // Reorder pages in state
        const reordered = pageIds.map((id, idx) => {
          const page = state.pages.find(p => p.id === id)
          return { ...page, position: idx }
        })
        commit('SET_PAGES', reordered)
      }
      return result.success
    } catch (err) {
      console.error('Failed to reorder pages:', err)
      return false
    }
  },

  async UPDATE_COLUMN_WIDTHS ({ commit, state }, columnWidths) {
    if (!state.currentDatabase) return false
    try {
      const result = await ipcRenderer.invoke('mt::database-update-column-widths', state.currentDatabase.id, columnWidths)
      if (result.success) {
        commit('SET_COLUMN_WIDTHS', columnWidths)
      }
      return result.success
    } catch (err) {
      console.error('Failed to update column widths:', err)
      return false
    }
  }
}

export default { state, getters, mutations, actions }
