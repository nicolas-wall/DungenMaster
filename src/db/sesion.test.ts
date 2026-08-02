import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { abrirDb } from './client.js';
import { abrirSesion, cerrarSesion, crearCampania, crearCapitulo, sesionAbierta } from './repo.js';

describe('sesiones', () => {
  let db: Database.Database;
  let capituloId: string;

  beforeEach(() => {
    db = abrirDb(':memory:');
    const campania = crearCampania(db, 'Test');
    const capitulo = crearCapitulo(db, { campaniaId: campania.id, numero: 1, escenasTotal: 8 });
    capituloId = capitulo.id;
  });

  it('no hay sesión abierta antes de abrir una', () => {
    expect(sesionAbierta(db, capituloId)).toBeNull();
  });

  it('abrirSesion crea una sesión sin fin', () => {
    const sesion = abrirSesion(db, capituloId);
    expect(sesion.fin).toBeNull();
    expect(sesionAbierta(db, capituloId)?.id).toBe(sesion.id);
  });

  it('cerrarSesion le pone fin y deja de contar como abierta', () => {
    const sesion = abrirSesion(db, capituloId);
    cerrarSesion(db, sesion.id);
    expect(sesionAbierta(db, capituloId)).toBeNull();
  });
});
