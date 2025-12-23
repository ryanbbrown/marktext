import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { SCHEMA, seedDemoData } from './schema'
import { getValueColumn, isValidPropertyType } from './propertyTypes'

/**
 * DatabaseManager handles all SQLite database operations for the
 * Notion-style database view feature.
 */
class DatabaseManager {
  constructor (userDataPath, vaultPath = null) {
    // Store the database in a subfolder to keep vault root clean
    this.dbPath = vaultPath ? path.join(vaultPath, 'database', 'database.sqlite') : path.join(userDataPath, 'databases.sqlite')
    this.vaultPath = vaultPath
    this.db = null
  }

  /**
   * Initialize the database connection and create tables
   */
  init () {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')

      // Create tables
      this.db.exec(SCHEMA)

      // Seed demo data if vault path is provided
      if (this.vaultPath) {
        const dbFolderPath = path.dirname(this.dbPath)
        seedDemoData(this.db, this.vaultPath, dbFolderPath)
      }

      console.log('DatabaseManager initialized successfully')
    } catch (err) {
      console.error('Failed to initialize DatabaseManager:', err)
      throw err
    }
  }

  /**
   * Close the database connection
   */
  close () {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  // ==================== Database Operations ====================

  /**
   * Get all databases
   * @returns {Array} List of database records
   */
  getAllDatabases () {
    const stmt = this.db.prepare(`
      SELECT id, name, folder_path as folderPath, column_widths as columnWidths,
             column_order as columnOrder, created_at as createdAt, updated_at as updatedAt
      FROM databases
      ORDER BY updated_at DESC
    `)
    return stmt.all().map(db => ({
      ...db,
      columnWidths: db.columnWidths ? JSON.parse(db.columnWidths) : {},
      columnOrder: db.columnOrder ? JSON.parse(db.columnOrder) : ['title', 'createdAt', 'updatedAt']
    }))
  }

  /**
   * Get a single database by ID
   * @param {string} id - Database ID
   * @returns {Object|undefined} Database record
   */
  getDatabase (id) {
    const stmt = this.db.prepare(`
      SELECT id, name, folder_path as folderPath, column_widths as columnWidths,
             column_order as columnOrder, created_at as createdAt, updated_at as updatedAt
      FROM databases
      WHERE id = ?
    `)
    const db = stmt.get(id)
    if (db) {
      db.columnWidths = db.columnWidths ? JSON.parse(db.columnWidths) : {}
      db.columnOrder = db.columnOrder ? JSON.parse(db.columnOrder) : ['title', 'createdAt', 'updatedAt']
    }
    return db
  }

  /**
   * Update column widths for a database
   * @param {string} databaseId - Database ID
   * @param {Object} columnWidths - Object mapping column IDs to widths
   * @returns {boolean} Success status
   */
  updateColumnWidths (databaseId, columnWidths) {
    const stmt = this.db.prepare('UPDATE databases SET column_widths = ? WHERE id = ?')
    const result = stmt.run(JSON.stringify(columnWidths), databaseId)
    return result.changes > 0
  }

  /**
   * Update column order for a database
   * @param {string} databaseId - Database ID
   * @param {string[]} columnOrder - Array of column IDs in display order
   * @returns {boolean} Success status
   */
  updateColumnOrder (databaseId, columnOrder) {
    const stmt = this.db.prepare('UPDATE databases SET column_order = ? WHERE id = ?')
    const result = stmt.run(JSON.stringify(columnOrder), databaseId)
    return result.changes > 0
  }

  /**
   * Create a new database
   * @param {string} id - UUID for the database
   * @param {string} name - Display name
   * @param {string} folderPath - Path to the folder
   * @returns {Object} The created database record
   */
  createDatabase (id, name, folderPath) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO databases (id, name, folder_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(id, name, folderPath, now, now)
    return this.getDatabase(id)
  }

  // ==================== Page Operations ====================

  /**
   * Get all pages for a database with property values
   * @param {string} databaseId - Database ID
   * @returns {Array} List of page records with properties
   */
  getPages (databaseId) {
    const pagesStmt = this.db.prepare(`
      SELECT id, database_id as databaseId, file_path as filePath, title,
             position, created_at as createdAt, updated_at as updatedAt
      FROM pages
      WHERE database_id = ?
      ORDER BY position ASC
    `)
    const pages = pagesStmt.all(databaseId)

    // Get all property values for these pages
    const propsStmt = this.db.prepare(`
      SELECT pp.page_id, pp.property_id, pp.value_text, pp.value_num, pp.value_bool, pp.value_json,
             p.type
      FROM page_properties pp
      JOIN properties p ON p.id = pp.property_id
      WHERE pp.page_id IN (SELECT id FROM pages WHERE database_id = ?)
    `)
    const propValues = propsStmt.all(databaseId)

    // Build a map of page_id -> { property_id -> value }
    const propsMap = {}
    for (const pv of propValues) {
      if (!propsMap[pv.page_id]) propsMap[pv.page_id] = {}
      const valueCol = getValueColumn(pv.type)
      propsMap[pv.page_id][pv.property_id] = pv[valueCol]
    }

    // Attach properties to each page
    return pages.map(page => ({
      ...page,
      properties: propsMap[page.id] || {}
    }))
  }

  /**
   * Create a new page with a markdown file (atomic - cleans up file if DB fails)
   * @param {string} databaseId - Database ID
   * @param {string} title - Page title
   * @returns {Object} The created page record
   */
  createPage (databaseId, title) {
    const database = this.getDatabase(databaseId)
    if (!database) {
      throw new Error('Database not found')
    }

    const id = uuidv4()
    const now = Date.now()
    const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_')
    const filePath = path.join(database.folderPath, `${sanitizedTitle}.md`)

    // Create the markdown file first
    fs.writeFileSync(filePath, `# ${title}\n`, 'utf-8')

    try {
      // Get max position and insert page record in transaction
      const insertPage = this.db.transaction(() => {
        const maxPos = this.db.prepare(
          'SELECT COALESCE(MAX(position), -1) as maxPos FROM pages WHERE database_id = ?'
        ).get(databaseId).maxPos

        this.db.prepare(`
          INSERT INTO pages (id, database_id, file_path, title, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, databaseId, filePath, title, maxPos + 1, now, now)

        return maxPos + 1
      })

      const position = insertPage()

      return {
        id,
        databaseId,
        filePath,
        title,
        position,
        createdAt: now,
        updatedAt: now,
        properties: {}
      }
    } catch (err) {
      // DB insert failed - clean up the file we created
      try {
        fs.unlinkSync(filePath)
      } catch (unlinkErr) {
        console.error('Failed to clean up orphan file:', unlinkErr)
      }
      throw err
    }
  }

  /**
   * Get a single page by ID
   * @param {string} id - Page ID
   * @returns {Object|undefined} Page record
   */
  getPage (id) {
    const stmt = this.db.prepare(`
      SELECT id, database_id as databaseId, file_path as filePath, title,
             position, created_at as createdAt, updated_at as updatedAt
      FROM pages
      WHERE id = ?
    `)
    return stmt.get(id)
  }

  /**
   * Get page content from the file system
   * @param {string} pageId - Page ID
   * @returns {Object} Page with content
   */
  getPageContent (pageId) {
    const page = this.getPage(pageId)
    if (!page) {
      return null
    }

    try {
      const content = fs.readFileSync(page.filePath, 'utf-8')
      return { ...page, content }
    } catch (err) {
      console.error('Failed to read page content:', err)
      return { ...page, content: '', error: err.message }
    }
  }

  /**
   * Save page content to the file system
   * @param {string} pageId - Page ID
   * @param {string} content - Markdown content
   * @returns {boolean} Success status
   */
  savePageContent (pageId, content) {
    const page = this.getPage(pageId)
    if (!page) {
      return false
    }

    try {
      fs.writeFileSync(page.filePath, content, 'utf-8')

      // Update the page's updated_at timestamp
      const now = Date.now()
      const stmt = this.db.prepare(`
        UPDATE pages SET updated_at = ? WHERE id = ?
      `)
      stmt.run(now, pageId)

      return true
    } catch (err) {
      console.error('Failed to save page content:', err)
      return false
    }
  }

  /**
   * Update page title
   * @param {string} pageId - Page ID
   * @param {string} title - New title
   * @returns {boolean} Success status
   */
  updatePageTitle (pageId, title) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE pages SET title = ?, updated_at = ? WHERE id = ?
    `)
    const result = stmt.run(title, now, pageId)
    return result.changes > 0
  }

  /**
   * Reorder pages by updating their positions
   * @param {string[]} pageIds - Array of page IDs in desired order
   * @returns {boolean} Success status
   */
  reorderPages (pageIds) {
    const stmt = this.db.prepare('UPDATE pages SET position = ? WHERE id = ?')
    const updateMany = this.db.transaction((ids) => {
      ids.forEach((id, index) => stmt.run(index, id))
    })
    updateMany(pageIds)
    return true
  }

  // ==================== Property Operations ====================

  /**
   * Get all properties for a database
   * @param {string} databaseId - Database ID
   * @returns {Array} List of property definitions
   */
  getProperties (databaseId) {
    const stmt = this.db.prepare(`
      SELECT id, database_id as databaseId, name, type, config, created_at as createdAt
      FROM properties
      WHERE database_id = ?
    `)
    const props = stmt.all(databaseId)
    return props.map(p => ({
      ...p,
      config: p.config ? JSON.parse(p.config) : null
    }))
  }

  /**
   * Create a new property and add it to column_order atomically
   * @param {string} databaseId - Database ID
   * @param {string} name - Property name
   * @param {string} type - Property type (text, number, select, date, checkbox)
   * @param {Object} config - Type-specific configuration
   * @param {number|null} insertIndex - Position in column_order to insert (null = end)
   * @returns {Object} The created property and updated column order
   */
  createProperty (databaseId, name, type, config = null, insertIndex = null) {
    if (!isValidPropertyType(type)) {
      throw new Error(`Invalid property type: ${type}`)
    }

    const id = uuidv4()
    const now = Date.now()

    const createPropertyTx = this.db.transaction(() => {
      // Insert the property
      this.db.prepare(`
        INSERT INTO properties (id, database_id, name, type, config, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, databaseId, name, type, config ? JSON.stringify(config) : null, now)

      // Update column_order
      const db = this.getDatabase(databaseId)
      const columnOrder = [...(db.columnOrder || ['title', 'createdAt', 'updatedAt'])]
      const idx = insertIndex != null ? insertIndex : columnOrder.length
      columnOrder.splice(idx, 0, id)

      this.db.prepare('UPDATE databases SET column_order = ? WHERE id = ?')
        .run(JSON.stringify(columnOrder), databaseId)

      return columnOrder
    })

    const columnOrder = createPropertyTx()

    return {
      property: {
        id,
        databaseId,
        name,
        type,
        config,
        createdAt: now
      },
      columnOrder
    }
  }

  /**
   * Update a property's name, type, or config
   * @param {string} propertyId - Property ID
   * @param {Object} updates - Fields to update
   * @returns {boolean} Success status
   */
  updateProperty (propertyId, updates) {
    const fields = []
    const values = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.type !== undefined) {
      if (!isValidPropertyType(updates.type)) {
        throw new Error(`Invalid property type: ${updates.type}`)
      }
      fields.push('type = ?')
      values.push(updates.type)
    }
    if (updates.config !== undefined) {
      fields.push('config = ?')
      values.push(updates.config ? JSON.stringify(updates.config) : null)
    }

    if (fields.length === 0) return false

    values.push(propertyId)
    const stmt = this.db.prepare(`UPDATE properties SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    return result.changes > 0
  }

  /**
   * Delete a property and remove it from column_order atomically
   * @param {string} propertyId - Property ID
   * @returns {Object} Result with success status and updated column order
   */
  deleteProperty (propertyId) {
    // Get the database ID for this property first
    const prop = this.db.prepare('SELECT database_id FROM properties WHERE id = ?').get(propertyId)
    if (!prop) {
      return { success: false, columnOrder: null }
    }

    const deletePropertyTx = this.db.transaction(() => {
      // Delete the property (cascades to page_properties)
      const result = this.db.prepare('DELETE FROM properties WHERE id = ?').run(propertyId)
      if (result.changes === 0) {
        return null
      }

      // Update column_order to remove this property
      const db = this.getDatabase(prop.database_id)
      const columnOrder = (db.columnOrder || []).filter(id => id !== propertyId)

      this.db.prepare('UPDATE databases SET column_order = ? WHERE id = ?')
        .run(JSON.stringify(columnOrder), prop.database_id)

      return columnOrder
    })

    const columnOrder = deletePropertyTx()
    return {
      success: columnOrder !== null,
      columnOrder
    }
  }

  // ==================== Page Property Operations ====================

  /**
   * Set a property value for a page
   * @param {string} pageId - Page ID
   * @param {string} propertyId - Property ID
   * @param {*} value - The value to set
   * @returns {boolean} Success status
   */
  setPageProperty (pageId, propertyId, value) {
    // Get the property type
    const prop = this.db.prepare('SELECT type FROM properties WHERE id = ?').get(propertyId)
    if (!prop) return false

    const valueCol = getValueColumn(prop.type)

    // Upsert the value
    const stmt = this.db.prepare(`
      INSERT INTO page_properties (page_id, property_id, ${valueCol})
      VALUES (?, ?, ?)
      ON CONFLICT(page_id, property_id)
      DO UPDATE SET ${valueCol} = excluded.${valueCol}
    `)
    stmt.run(pageId, propertyId, value)

    // Update page's updated_at
    const now = Date.now()
    this.db.prepare('UPDATE pages SET updated_at = ? WHERE id = ?').run(now, pageId)

    return true
  }

  /**
   * Get a page with all its property values
   * @param {string} pageId - Page ID
   * @returns {Object|null} Page with properties
   */
  getPageWithProperties (pageId) {
    const page = this.getPage(pageId)
    if (!page) return null

    const propsStmt = this.db.prepare(`
      SELECT pp.property_id, pp.value_text, pp.value_num, pp.value_bool, pp.value_json,
             p.type
      FROM page_properties pp
      JOIN properties p ON p.id = pp.property_id
      WHERE pp.page_id = ?
    `)
    const propValues = propsStmt.all(pageId)

    const properties = {}
    for (const pv of propValues) {
      const valueCol = getValueColumn(pv.type)
      properties[pv.property_id] = pv[valueCol]
    }

    return { ...page, properties }
  }
}

export default DatabaseManager
