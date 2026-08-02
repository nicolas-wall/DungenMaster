import { describe, expect, it } from 'vitest';
import { abrirDb } from './client.js';
import { crearPersonaje } from './repo.js';

describe('migraciones', () => {
  it('crea todas las tablas del esquema', () => {
    const db = abrirDb(':memory:');
    const tablas = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r) => (r as { name: string }).name)
      .sort();

    expect(tablas).toEqual(
      [
        '_migraciones',
        'campania',
        'campania_personaje',
        'capitulo',
        'flag',
        'hilo',
        'item',
        'npc',
        'personaje',
        'sesion',
        'turno',
      ].sort(),
    );
  });

  it('es idempotente: abrir la DB dos veces no falla ni duplica migraciones', () => {
    const db = abrirDb(':memory:');
    expect(() => abrirDb(':memory:')).not.toThrow();
    const aplicadas = db.prepare('SELECT COUNT(*) as n FROM _migraciones').get() as { n: number };
    expect(aplicadas.n).toBe(2);
  });

  it('el CHECK de atributos rechaza valores fuera de 8-16 a nivel de esquema', () => {
    const db = abrirDb(':memory:');
    expect(() =>
      crearPersonaje(db, {
        jugador: 'hijo',
        nombre: 'Roto',
        arquetipo: 'guardian',
        fuerza: 20,
        astucia: 10,
        corazon: 8,
      }),
    ).toThrow();
  });

  it('el CHECK de jugador rechaza valores fuera de papa/hijo', () => {
    const db = abrirDb(':memory:');
    expect(() =>
      crearPersonaje(db, {
        // @ts-expect-error probando el CHECK de la DB con un valor inválido
        jugador: 'abuelo',
        nombre: 'Roto',
        arquetipo: 'guardian',
        fuerza: 10,
        astucia: 10,
        corazon: 10,
      }),
    ).toThrow();
  });
});
