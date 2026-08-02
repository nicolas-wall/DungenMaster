import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { abrirDb } from './client.js';
import {
  campaniasDePersonaje,
  crearCampania,
  crearCapitulo,
  crearHilo,
  crearPersonaje,
  darItem,
  eliminarPersonaje,
  obtenerCapitulo,
  obtenerPersonaje,
  pasarTurno,
  vincularPersonajeACampania,
} from './repo.js';

describe('eliminarPersonaje', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = abrirDb(':memory:');
  });

  it('borra el personaje y rompe las referencias en todas las campañas donde jugó', () => {
    const bruno = crearPersonaje(db, {
      jugador: 'hijo',
      nombre: 'Bruno',
      arquetipo: 'guardian',
      fuerza: 12,
      astucia: 10,
      corazon: 8,
    });
    darItem(db, { personajeId: bruno.id, nombre: 'Escudo' });

    const c1 = crearCampania(db, 'Primera');
    const cap1 = crearCapitulo(db, { campaniaId: c1.id, numero: 1, escenasTotal: 8 });
    vincularPersonajeACampania(db, c1.id, bruno.id);
    pasarTurno(db, cap1.id, bruno.id); // capitulo.turno_actual -> bruno
    const hilo1 = crearHilo(db, { campaniaId: c1.id, descripcion: 'Un hilo', origen: 'jugador', personajeId: bruno.id, creadoCap: 1 });

    const c2 = crearCampania(db, 'Segunda');
    const cap2 = crearCapitulo(db, { campaniaId: c2.id, numero: 1, escenasTotal: 12 });
    vincularPersonajeACampania(db, c2.id, bruno.id);
    pasarTurno(db, cap2.id, bruno.id); // otra campaña, misma referencia circular

    eliminarPersonaje(db, bruno.id);

    expect(() => obtenerPersonaje(db, bruno.id)).toThrow();
    expect(db.prepare('SELECT COUNT(*) as n FROM item WHERE personaje_id = ?').get(bruno.id)).toEqual({ n: 0 });
    expect(
      db.prepare('SELECT COUNT(*) as n FROM campania_personaje WHERE personaje_id = ?').get(bruno.id),
    ).toEqual({ n: 0 });
    expect(obtenerCapitulo(db, cap1.id).turno_actual).toBeNull();
    expect(obtenerCapitulo(db, cap2.id).turno_actual).toBeNull();
    expect(db.prepare('SELECT personaje_id FROM hilo WHERE id = ?').get(hilo1.id)).toEqual({ personaje_id: null });
  });

  it('no toca otros personajes ni sus campañas', () => {
    const bruno = crearPersonaje(db, { jugador: 'hijo', nombre: 'Bruno', arquetipo: 'guardian', fuerza: 12, astucia: 10, corazon: 8 });
    const elian = crearPersonaje(db, { jugador: 'papa', nombre: 'Elián', arquetipo: 'explorador', fuerza: 10, astucia: 12, corazon: 8 });
    const campania = crearCampania(db, 'Compartida');
    crearCapitulo(db, { campaniaId: campania.id, numero: 1, escenasTotal: 8 });
    vincularPersonajeACampania(db, campania.id, bruno.id);
    vincularPersonajeACampania(db, campania.id, elian.id);

    eliminarPersonaje(db, bruno.id);

    expect(obtenerPersonaje(db, elian.id).nombre).toBe('Elián');
    expect(campaniasDePersonaje(db, elian.id).map((c) => c.titulo)).toEqual(['Compartida']);
  });

  it('tira error si el personaje no existe', () => {
    expect(() => eliminarPersonaje(db, 'no-existe')).toThrow();
  });
});

describe('campaniasDePersonaje', () => {
  it('lista las campañas donde participa un personaje', () => {
    const db = abrirDb(':memory:');
    const bruno = crearPersonaje(db, { jugador: 'hijo', nombre: 'Bruno', arquetipo: 'guardian', fuerza: 12, astucia: 10, corazon: 8 });
    const c1 = crearCampania(db, 'Aventura 1');
    const c2 = crearCampania(db, 'Aventura 2');
    vincularPersonajeACampania(db, c1.id, bruno.id);
    vincularPersonajeACampania(db, c2.id, bruno.id);

    expect(campaniasDePersonaje(db, bruno.id).map((c) => c.titulo).sort()).toEqual(['Aventura 1', 'Aventura 2']);
  });

  it('devuelve vacío si no participa en ninguna', () => {
    const db = abrirDb(':memory:');
    const bruno = crearPersonaje(db, { jugador: 'hijo', nombre: 'Bruno', arquetipo: 'guardian', fuerza: 12, astucia: 10, corazon: 8 });
    expect(campaniasDePersonaje(db, bruno.id)).toEqual([]);
  });
});
