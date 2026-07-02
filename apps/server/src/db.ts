import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
// Node 내장 SQLite — 네이티브 빌드 불필요 (Node 24+)
import { DatabaseSync } from 'node:sqlite'
import { env } from './env'

mkdirSync(env.dataDir, { recursive: true })

export const db = new DatabaseSync(join(env.dataDir, 'nwh.sqlite'))
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS recorded_sessions (
    session_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mappings (
    db_id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`)

export function hasSession(sessionId: string): boolean {
  return (
    db.prepare('SELECT 1 FROM recorded_sessions WHERE session_id = ?').get(sessionId) !==
    undefined
  )
}

export function saveSession(sessionId: string): void {
  db.prepare(
    'INSERT OR IGNORE INTO recorded_sessions (session_id, created_at) VALUES (?, ?)',
  ).run(sessionId, Date.now())
}

export function loadMapping(dbId: string): Record<string, string> | null {
  const row = db.prepare('SELECT json FROM mappings WHERE db_id = ?').get(dbId) as
    | { json: string }
    | undefined
  if (!row) return null
  try {
    return JSON.parse(row.json) as Record<string, string>
  } catch {
    return null
  }
}

export function saveMapping(dbId: string, mapping: Record<string, string>): void {
  db.prepare(
    'INSERT OR REPLACE INTO mappings (db_id, json, created_at) VALUES (?, ?, ?)',
  ).run(dbId, JSON.stringify(mapping), Date.now())
}

export function clearMapping(dbId: string): void {
  db.prepare('DELETE FROM mappings WHERE db_id = ?').run(dbId)
}
