import path from 'path'
import fs from 'fs'
import { ipcMain } from 'electron'

/** Recursively scan a directory for database.sqlite files */
const scanForDatabases = (rootPath, maxDepth = 5) => {
  const databases = {}
  const scan = (dirPath, depth) => {
    if (depth > maxDepth) return
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          scan(fullPath, depth + 1)
        } else if (entry.name === 'database.sqlite') {
          const folderPath = dirPath
          databases[folderPath] = {
            path: fullPath,
            folderPath,
            name: path.basename(folderPath)
          }
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }
  scan(rootPath, 0)
  return databases
}

/**
 * Register IPC handlers for database operations
 * @param {DatabaseManager} databaseManager - The database manager instance
 */
export const registerDatabaseIpcHandlers = (databaseManager) => {
  // Scan project for database.sqlite files
  ipcMain.handle('mt::scan-project-databases', async (event, projectPath) => {
    try {
      console.log('[DB Main] Scanning for databases in:', projectPath)
      const databases = scanForDatabases(projectPath)
      console.log('[DB Main] Found databases:', databases)
      return { success: true, data: databases }
    } catch (err) {
      console.error('Error scanning for databases:', err)
      return { success: false, error: err.message }
    }
  })
  // Get all databases
  ipcMain.handle('mt::database-get-all', async () => {
    try {
      return {
        success: true,
        data: databaseManager.getAllDatabases()
      }
    } catch (err) {
      console.error('Error getting databases:', err)
      return { success: false, error: err.message }
    }
  })

  // Get single database
  ipcMain.handle('mt::database-get', async (event, databaseId) => {
    try {
      const database = databaseManager.getDatabase(databaseId)
      if (!database) {
        return { success: false, error: 'Database not found' }
      }
      return { success: true, data: database }
    } catch (err) {
      console.error('Error getting database:', err)
      return { success: false, error: err.message }
    }
  })

  // Update column widths
  ipcMain.handle('mt::database-update-column-widths', async (event, databaseId, columnWidths) => {
    try {
      const success = databaseManager.updateColumnWidths(databaseId, columnWidths)
      if (!success) {
        return { success: false, error: 'Failed to update column widths' }
      }
      return { success: true }
    } catch (err) {
      console.error('Error updating column widths:', err)
      return { success: false, error: err.message }
    }
  })

  // Update column order
  ipcMain.handle('mt::database-update-column-order', async (event, databaseId, columnOrder) => {
    try {
      const success = databaseManager.updateColumnOrder(databaseId, columnOrder)
      if (!success) {
        return { success: false, error: 'Failed to update column order' }
      }
      return { success: true }
    } catch (err) {
      console.error('Error updating column order:', err)
      return { success: false, error: err.message }
    }
  })

  // Get pages for a database
  ipcMain.handle('mt::database-get-pages', async (event, databaseId) => {
    try {
      return {
        success: true,
        data: databaseManager.getPages(databaseId)
      }
    } catch (err) {
      console.error('Error getting pages:', err)
      return { success: false, error: err.message }
    }
  })

  // Create a new page
  ipcMain.handle('mt::database-create-page', async (event, databaseId, title) => {
    try {
      const page = databaseManager.createPage(databaseId, title)
      return { success: true, data: page }
    } catch (err) {
      console.error('Error creating page:', err)
      return { success: false, error: err.message }
    }
  })

  // Get page content
  ipcMain.handle('mt::database-get-page-content', async (event, pageId) => {
    try {
      const page = databaseManager.getPageContent(pageId)
      if (!page) {
        return { success: false, error: 'Page not found' }
      }
      return { success: true, data: page }
    } catch (err) {
      console.error('Error getting page content:', err)
      return { success: false, error: err.message }
    }
  })

  // Save page content
  ipcMain.handle('mt::database-save-page', async (event, pageId, content) => {
    try {
      const success = databaseManager.savePageContent(pageId, content)
      if (!success) {
        return { success: false, error: 'Failed to save page' }
      }
      return { success: true }
    } catch (err) {
      console.error('Error saving page:', err)
      return { success: false, error: err.message }
    }
  })

  // Update page title
  ipcMain.handle('mt::database-update-page-title', async (event, pageId, title) => {
    try {
      const success = databaseManager.updatePageTitle(pageId, title)
      if (!success) {
        return { success: false, error: 'Failed to update title' }
      }
      return { success: true }
    } catch (err) {
      console.error('Error updating page title:', err)
      return { success: false, error: err.message }
    }
  })

  // Reorder pages
  ipcMain.handle('mt::database-reorder-pages', async (event, pageIds) => {
    try {
      databaseManager.reorderPages(pageIds)
      return { success: true }
    } catch (err) {
      console.error('Error reordering pages:', err)
      return { success: false, error: err.message }
    }
  })

  // ==================== Property Handlers ====================

  // Get properties for a database
  ipcMain.handle('mt::database-get-properties', async (event, databaseId) => {
    try {
      return {
        success: true,
        data: databaseManager.getProperties(databaseId)
      }
    } catch (err) {
      console.error('Error getting properties:', err)
      return { success: false, error: err.message }
    }
  })

  // Create a new property (atomic: also updates column_order)
  ipcMain.handle('mt::database-create-property', async (event, databaseId, name, type, config, insertIndex) => {
    try {
      const result = databaseManager.createProperty(databaseId, name, type, config, insertIndex)
      return { success: true, data: result }
    } catch (err) {
      console.error('Error creating property:', err)
      return { success: false, error: err.message }
    }
  })

  // Update a property
  ipcMain.handle('mt::database-update-property', async (event, propertyId, updates) => {
    try {
      const success = databaseManager.updateProperty(propertyId, updates)
      if (!success) {
        return { success: false, error: 'Failed to update property' }
      }
      return { success: true }
    } catch (err) {
      console.error('Error updating property:', err)
      return { success: false, error: err.message }
    }
  })

  // Delete a property (atomic: also updates column_order)
  ipcMain.handle('mt::database-delete-property', async (event, propertyId) => {
    try {
      const result = databaseManager.deleteProperty(propertyId)
      if (!result.success) {
        return { success: false, error: 'Failed to delete property' }
      }
      return { success: true, data: { columnOrder: result.columnOrder } }
    } catch (err) {
      console.error('Error deleting property:', err)
      return { success: false, error: err.message }
    }
  })

  // Set page property value
  ipcMain.handle('mt::database-set-page-property', async (event, pageId, propertyId, value) => {
    try {
      const success = databaseManager.setPageProperty(pageId, propertyId, value)
      if (!success) {
        return { success: false, error: 'Failed to set page property' }
      }
      return { success: true }
    } catch (err) {
      console.error('Error setting page property:', err)
      return { success: false, error: err.message }
    }
  })
}

export default registerDatabaseIpcHandlers
