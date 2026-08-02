import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { abrirDb } from './client.js';
import {
  crearCampania,
  crearCapitulo,
  crearHilo,
  crearNpc,
  crearPersonaje,
  darItem,
  detalleCampania,
  eliminarCampania,
  listarCampanias,
  obtenerCampania,
  pasarTurno,
  registrarTurno,
  setFlag,
} from './repo.js';

describe('listarCampanias', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = abrirDb(':memory:');
  });

  it('devuelve las campañas más nuevas primero, con capítulo y personajes', () => {
    const c1 = crearCampania(db, 'Primera');
    crearCapitulo(db, { campaniaId: c1.id, numero: 1, escenasTotal: 8 });
    crearPersonaje(db, {
      campaniaId: c1.id,
      jugador: 'hijo',
      nombre: 'Bruno',
      arquetipo: 'guardian',
      fuerza: 12,
      astucia: 10,
      corazon: 8,
    });

    const c2 = crearCampania(db, 'Segunda');
    crearCapitulo(db, { campaniaId: c2.id, numero: 1, escenasTotal: 12 });

    const lista = listarCampanias(db);
    expect(lista.map((c) => c.titulo)).toEqual(['Segunda', 'Primera']);

    const primera = lista.find((c) => c.titulo === 'Primera')!;
    expect(primera.capitulo?.escenasTotal).toBe(8);
    expect(primera.personajes).toHaveLength(1);
    expect(primera.personajes[0].nombre).toBe('Bruno');
  });

  it('campaña sin capítulo todavía devuelve capitulo: null', () => {
    crearCampania(db, 'Sin capítulo');
    const [resumen] = listarCampanias(db);
    expect(resumen.capitulo).toBeNull();
  });
});

describe('detalleCampania', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = abrirDb(':memory:');
  });

  it('trae la hoja completa: atributos, hp, e items por personaje', () => {
    const campania = crearCampania(db, 'Test');
    crearCapitulo(db, { campaniaId: campania.id, numero: 1, escenasTotal: 8 });
    const bruno = crearPersonaje(db, {
      campaniaId: campania.id,
      jugador: 'hijo',
      nombre: 'Bruno',
      arquetipo: 'guardian',
      fuerza: 12,
      astucia: 10,
      corazon: 8,
      debilidad: 'Le tiene miedo a la oscuridad',
    });
    darItem(db, { personajeId: bruno.id, nombre: 'Escudo de madera pintado' });

    const detalle = detalleCampania(db, campania.id);
    expect(detalle.campania.titulo).toBe('Test');
    expect(detalle.capitulo?.numero).toBe(1);
    expect(detalle.personajes).toHaveLength(1);
    expect(detalle.personajes[0].debilidad).toBe('Le tiene miedo a la oscuridad');
    expect(detalle.personajes[0].items.map((i) => i.nombre)).toEqual(['Escudo de madera pintado']);
  });
});

describe('eliminarCampania', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = abrirDb(':memory:');
  });

  it('borra la campaña y todo lo que cuelga de ella, incluida la referencia circular con hilo_semilla_id', () => {
    const campania = crearCampania(db, 'A borrar');
    const capitulo = crearCapitulo(db, { campaniaId: campania.id, numero: 1, escenasTotal: 8 });
    const bruno = crearPersonaje(db, {
      campaniaId: campania.id,
      jugador: 'hijo',
      nombre: 'Bruno',
      arquetipo: 'guardian',
      fuerza: 12,
      astucia: 10,
      corazon: 8,
    });
    darItem(db, { personajeId: bruno.id, nombre: 'Escudo' });
    crearNpc(db, { campaniaId: campania.id, nombre: 'Duende' });
    const hilo = crearHilo(db, { campaniaId: campania.id, descripcion: 'Un hilo', origen: 'jugador', creadoCap: 1 });
    db.prepare('UPDATE capitulo SET hilo_semilla_id = ? WHERE id = ?').run(hilo.id, capitulo.id);
    setFlag(db, campania.id, 'puerta_abierta', 'true');
    registrarTurno(db, { capituloId: capitulo.id, autor: bruno.id, texto: 'hola' });
    pasarTurno(db, capitulo.id, bruno.id); // capitulo.turno_actual -> personaje(bruno.id)

    eliminarCampania(db, campania.id);

    expect(() => obtenerCampania(db, campania.id)).toThrow();
    expect(db.prepare('SELECT COUNT(*) as n FROM personaje WHERE campania_id = ?').get(campania.id)).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) as n FROM npc WHERE campania_id = ?').get(campania.id)).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) as n FROM hilo WHERE campania_id = ?').get(campania.id)).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) as n FROM flag WHERE campania_id = ?').get(campania.id)).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) as n FROM item WHERE personaje_id = ?').get(bruno.id)).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) as n FROM turno WHERE capitulo_id = ?').get(capitulo.id)).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) as n FROM capitulo WHERE campania_id = ?').get(campania.id)).toEqual({ n: 0 });
  });

  it('no toca otras campañas', () => {
    const c1 = crearCampania(db, 'Borrar');
    crearCapitulo(db, { campaniaId: c1.id, numero: 1, escenasTotal: 8 });
    const c2 = crearCampania(db, 'Conservar');
    crearCapitulo(db, { campaniaId: c2.id, numero: 1, escenasTotal: 12 });

    eliminarCampania(db, c1.id);

    expect(obtenerCampania(db, c2.id).titulo).toBe('Conservar');
    expect(listarCampanias(db)).toHaveLength(1);
  });

  it('tira error si la campaña no existe', () => {
    expect(() => eliminarCampania(db, 'no-existe')).toThrow();
  });
});
