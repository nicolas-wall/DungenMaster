import type Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'migrations',
);

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migraciones (
      nombre TEXT PRIMARY KEY,
      aplicada_en INTEGER NOT NULL
    );
  `);

  const aplicadas = new Set(
    db.prepare('SELECT nombre FROM _migraciones').all().map((r) => (r as { nombre: string }).nombre),
  );

  const archivos = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const marcarAplicada = db.prepare(
    'INSERT INTO _migraciones (nombre, aplicada_en) VALUES (?, ?)',
  );

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, archivo), 'utf-8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      marcarAplicada.run(archivo, Date.now());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
