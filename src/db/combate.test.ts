import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { abrirDb } from './client.js';
import {
  aplicarDanoNpc,
  aplicarDanoPersonaje,
  crearCampania,
  crearCapitulo,
  crearNpc,
  crearPersonaje,
  curarPersonaje,
  obtenerNpc,
  obtenerPersonaje,
} from './repo.js';
import { resolverTirada } from '../motor/tirada.js';

describe('simulación de un combate completo', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = abrirDb(':memory:');
  });

  it('mantiene HP, estado de personajes y NPCs consistentes de punta a punta', () => {
    const campania = crearCampania(db, 'La cueva del duende');
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
    const papa = crearPersonaje(db, {
      campaniaId: campania.id,
      jugador: 'papa',
      nombre: 'Elián',
      arquetipo: 'explorador',
      fuerza: 10,
      astucia: 12,
      corazon: 8,
    });

    const duende = crearNpc(db, {
      campaniaId: campania.id,
      nombre: 'Duende gruñón',
      hp: 3,
    });

    expect(bruno.hp).toBe(6);
    expect(duende.estado).toBe('vivo');

    // Bruno ataca al duende: tirada de Fuerza contra objetivo 12, saca 8 -> éxito.
    const exitoAtaque = resolverTirada(8, bruno.fuerza);
    expect(exitoAtaque).toBe(true);
    let resultadoDuende = aplicarDanoNpc(db, duende.id, 4); // 1d4 de daño de guardián
    expect(resultadoDuende).toEqual({ hpNuevo: 0, fueraDeCombate: true });
    expect(obtenerNpc(db, duende.id).estado).toBe('derrotado');

    // El duende ya derrotado no vuelve a atacar: no hay más daño aplicado a los jugadores por su parte.
    // Un segundo peligro de la escena golpea a Bruno.
    const resultadoBruno = aplicarDanoPersonaje(db, bruno.id, 4);
    expect(resultadoBruno).toEqual({ hpNuevo: 2, fueraDeCombate: false });
    expect(obtenerPersonaje(db, bruno.id).hp).toBe(2);

    // Un golpe más grande lo deja Fuera de Combate, nunca "muerto".
    const golpeFinal = aplicarDanoPersonaje(db, bruno.id, 5);
    expect(golpeFinal).toEqual({ hpNuevo: 0, fueraDeCombate: true });
    expect(obtenerPersonaje(db, bruno.id).hp).toBe(0);

    // Descanso corto al cierre de la escena: cura y confirma que el otro personaje no fue tocado.
    const hpTrasDescanso = curarPersonaje(db, bruno.id, 3);
    expect(hpTrasDescanso).toBe(3);
    expect(obtenerPersonaje(db, papa.id).hp).toBe(6);

    // La curación nunca pasa el HP máximo.
    curarPersonaje(db, bruno.id, 10);
    expect(obtenerPersonaje(db, bruno.id).hp).toBe(bruno.hp_max);

    // El estado del capítulo no fue tocado por el combate: sigue en curso, escena 1.
    expect(capitulo.estado).toBe('en_curso');
    expect(capitulo.escena_actual).toBe(1);
  });

  it('rechaza daño negativo y no corrompe el HP existente', () => {
    const campania = crearCampania(db, 'Campaña de prueba');
    const personaje = crearPersonaje(db, {
      campaniaId: campania.id,
      jugador: 'hijo',
      nombre: 'Nina',
      arquetipo: 'curioso',
      fuerza: 8,
      astucia: 14,
      corazon: 8,
    });

    expect(() => aplicarDanoPersonaje(db, personaje.id, -3)).toThrow();
    expect(obtenerPersonaje(db, personaje.id).hp).toBe(personaje.hp_max);
  });
});
