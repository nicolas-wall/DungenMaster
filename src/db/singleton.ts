import type Database from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { abrirDb } from './client.js';

let instancia: Database.Database | null = null;

/** Una sola conexión SQLite por proceso del server de Next.js. */
export function db(): Database.Database {
  if (instancia) return instancia;

  const rutaDb = process.env.DB_PATH ?? path.resolve('data/campania.db');
  mkdirSync(path.dirname(rutaDb), { recursive: true });
  instancia = abrirDb(rutaDb);
  return instancia;
}
