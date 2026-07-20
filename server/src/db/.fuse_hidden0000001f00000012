// SQLite connection behind Drizzle. Swappable to Postgres later without touching callers.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config.js';
import * as schema from './schema.js';

const sqlite = new Database(config.dbFile);
sqlite.pragma('journal_mode = WAL'); // safer concurrent reads for the journey endpoint

export const db = drizzle(sqlite, { schema });
export { sqlite, schema };
