import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

/**
 * SQL schema for the database tables
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    folder_path TEXT NOT NULL UNIQUE,
    column_widths JSON,
    column_order JSON,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    database_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    database_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config JSON,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS page_properties (
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    value_text TEXT,
    value_num REAL,
    value_bool INTEGER,
    value_json JSON,
    PRIMARY KEY (page_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_pages_database_id ON pages(database_id);
CREATE INDEX IF NOT EXISTS idx_properties_database_id ON properties(database_id);
CREATE INDEX IF NOT EXISTS idx_page_properties_page_id ON page_properties(page_id);
CREATE INDEX IF NOT EXISTS idx_page_properties_property_id ON page_properties(property_id);
`

/**
 * Seed the database with demo data from a folder
 * @param {Database} db - The better-sqlite3 database instance
 * @param {string} vaultPath - Path to the vault folder containing markdown files
 */
export const seedDemoData = (db, vaultPath, dbFolderPath) => {
  // Check if we already have data
  const existingDatabases = db.prepare('SELECT COUNT(*) as count FROM databases').get()
  if (existingDatabases.count > 0) {
    return // Don't seed if data exists
  }

  // Check if vault path exists
  if (!fs.existsSync(vaultPath)) {
    console.log('Vault path does not exist, skipping seed:', vaultPath)
    return
  }

  const now = Date.now()
  const databaseId = uuidv4()

  // Create a demo database entry with default column order
  // folder_path is the database directory (for lookup), but files are in vaultPath
  const defaultColumnOrder = JSON.stringify(['title', 'createdAt', 'updatedAt'])
  const insertDatabase = db.prepare(`
    INSERT INTO databases (id, name, folder_path, column_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertDatabase.run(databaseId, 'My Notes', dbFolderPath, defaultColumnOrder, now, now)

  // Find all markdown files in the vault
  const files = fs.readdirSync(vaultPath).filter(f => f.endsWith('.md'))

  const insertPage = db.prepare(`
    INSERT INTO pages (id, database_id, file_path, title, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  files.forEach((file, index) => {
    const filePath = path.join(vaultPath, file)
    const stats = fs.statSync(filePath)
    const title = file.replace(/\.md$/, '')

    insertPage.run(
      uuidv4(),
      databaseId,
      filePath,
      title,
      index,
      stats.birthtimeMs || now,
      stats.mtimeMs || now
    )
  })

  console.log(`Seeded database with ${files.length} pages from vault`)
}
