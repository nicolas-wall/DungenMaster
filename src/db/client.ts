import Database from 'better-sqlite3';
import { migrate } from './migrate.js';

export function abrirDb(archivo: string = ':memory:'): Database.Database {
  const db = new Database(archivo);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}
