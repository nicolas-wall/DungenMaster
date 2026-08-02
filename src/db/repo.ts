import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { aplicarDano, curar, type ResultadoDano } from '../motor/dano.js';

export interface Campania {
  id: string;
  titulo: string;
  cronica: string;
  creada_en: number;
}

export interface Capitulo {
  id: string;
  campania_id: string;
  numero: number;
  titulo: string | null;
  escenas_total: number;
  escena_actual: number;
  resumen: string;
  estado: 'en_curso' | 'cerrado';
  hilo_semilla_id: string | null;
  turno_actual: string | null;
  escena_desc: string | null;
  cerrado_en: number | null;
}

export interface Personaje {
  id: string;
  campania_id: string;
  jugador: 'papa' | 'hijo';
  nombre: string;
  arquetipo: string;
  fuerza: number;
  astucia: number;
  corazon: number;
  hp: number;
  hp_max: number;
  debilidad: string | null;
  capitulos_jugados: number;
}

export interface Npc {
  id: string;
  campania_id: string;
  nombre: string;
  descripcion: string | null;
  estado: 'vivo' | 'huido' | 'derrotado' | 'aliado';
  hp: number | null;
  voz_id: string | null;
}

export function crearCampania(db: Database.Database, titulo: string): Campania {
  const campania: Campania = { id: randomUUID(), titulo, cronica: '', creada_en: Date.now() };
  db.prepare(
    'INSERT INTO campania (id, titulo, cronica, creada_en) VALUES (@id, @titulo, @cronica, @creada_en)',
  ).run(campania);
  return campania;
}

export function crearCapitulo(
  db: Database.Database,
  datos: { campaniaId: string; numero: number; titulo?: string; escenasTotal: number },
): Capitulo {
  const capitulo: Capitulo = {
    id: randomUUID(),
    campania_id: datos.campaniaId,
    numero: datos.numero,
    titulo: datos.titulo ?? null,
    escenas_total: datos.escenasTotal,
    escena_actual: 1,
    resumen: '',
    estado: 'en_curso',
    hilo_semilla_id: null,
    turno_actual: null,
    escena_desc: null,
    cerrado_en: null,
  };
  db.prepare(
    `INSERT INTO capitulo
      (id, campania_id, numero, titulo, escenas_total, escena_actual, resumen, estado, hilo_semilla_id, turno_actual, escena_desc, cerrado_en)
     VALUES
      (@id, @campania_id, @numero, @titulo, @escenas_total, @escena_actual, @resumen, @estado, @hilo_semilla_id, @turno_actual, @escena_desc, @cerrado_en)`,
  ).run(capitulo);
  return capitulo;
}

export function obtenerCapitulo(db: Database.Database, id: string): Capitulo {
  const fila = db.prepare('SELECT * FROM capitulo WHERE id = ?').get(id) as Capitulo | undefined;
  if (!fila) throw new Error(`capítulo no encontrado: ${id}`);
  return fila;
}

export function moverEscena(db: Database.Database, capituloId: string, nuevaEscena: number): Capitulo {
  db.prepare('UPDATE capitulo SET escena_actual = ? WHERE id = ?').run(nuevaEscena, capituloId);
  return obtenerCapitulo(db, capituloId);
}

export function crearPersonaje(
  db: Database.Database,
  datos: {
    campaniaId: string;
    jugador: 'papa' | 'hijo';
    nombre: string;
    arquetipo: string;
    fuerza: number;
    astucia: number;
    corazon: number;
    hpMax?: number;
    debilidad?: string;
  },
): Personaje {
  const hpMax = datos.hpMax ?? 6;
  const personaje: Personaje = {
    id: randomUUID(),
    campania_id: datos.campaniaId,
    jugador: datos.jugador,
    nombre: datos.nombre,
    arquetipo: datos.arquetipo,
    fuerza: datos.fuerza,
    astucia: datos.astucia,
    corazon: datos.corazon,
    hp: hpMax,
    hp_max: hpMax,
    debilidad: datos.debilidad ?? null,
    capitulos_jugados: 0,
  };
  db.prepare(
    `INSERT INTO personaje
      (id, campania_id, jugador, nombre, arquetipo, fuerza, astucia, corazon, hp, hp_max, debilidad, capitulos_jugados)
     VALUES
      (@id, @campania_id, @jugador, @nombre, @arquetipo, @fuerza, @astucia, @corazon, @hp, @hp_max, @debilidad, @capitulos_jugados)`,
  ).run(personaje);
  return personaje;
}

export function obtenerPersonaje(db: Database.Database, id: string): Personaje {
  const fila = db.prepare('SELECT * FROM personaje WHERE id = ?').get(id) as Personaje | undefined;
  if (!fila) throw new Error(`personaje no encontrado: ${id}`);
  return fila;
}

export function aplicarDanoPersonaje(
  db: Database.Database,
  personajeId: string,
  cantidad: number,
): ResultadoDano {
  const personaje = obtenerPersonaje(db, personajeId);
  const resultado = aplicarDano(personaje.hp, cantidad);
  db.prepare('UPDATE personaje SET hp = ? WHERE id = ?').run(resultado.hpNuevo, personajeId);
  return resultado;
}

export function curarPersonaje(db: Database.Database, personajeId: string, cantidad: number): number {
  const personaje = obtenerPersonaje(db, personajeId);
  const hpNuevo = curar(personaje.hp, cantidad, personaje.hp_max);
  db.prepare('UPDATE personaje SET hp = ? WHERE id = ?').run(hpNuevo, personajeId);
  return hpNuevo;
}

export function crearNpc(
  db: Database.Database,
  datos: { campaniaId: string; nombre: string; descripcion?: string; hp?: number; vozId?: string },
): Npc {
  const npc: Npc = {
    id: randomUUID(),
    campania_id: datos.campaniaId,
    nombre: datos.nombre,
    descripcion: datos.descripcion ?? null,
    estado: 'vivo',
    hp: datos.hp ?? null,
    voz_id: datos.vozId ?? null,
  };
  db.prepare(
    `INSERT INTO npc (id, campania_id, nombre, descripcion, estado, hp, voz_id)
     VALUES (@id, @campania_id, @nombre, @descripcion, @estado, @hp, @voz_id)`,
  ).run(npc);
  return npc;
}

export function obtenerNpc(db: Database.Database, id: string): Npc {
  const fila = db.prepare('SELECT * FROM npc WHERE id = ?').get(id) as Npc | undefined;
  if (!fila) throw new Error(`npc no encontrado: ${id}`);
  return fila;
}

/** Daño a NPC: si su HP llega a 0, queda 'derrotado'. npc.hp puede ser null (sin HP trackeado). */
export function aplicarDanoNpc(db: Database.Database, npcId: string, cantidad: number): ResultadoDano {
  const npc = obtenerNpc(db, npcId);
  if (npc.hp === null) throw new Error(`npc ${npcId} no tiene HP trackeado`);
  const resultado = aplicarDano(npc.hp, cantidad);
  const nuevoEstado = resultado.fueraDeCombate ? 'derrotado' : npc.estado;
  db.prepare('UPDATE npc SET hp = ?, estado = ? WHERE id = ?').run(resultado.hpNuevo, nuevoEstado, npcId);
  return resultado;
}

export function actualizarEstadoNpc(
  db: Database.Database,
  npcId: string,
  estado: Npc['estado'],
): Npc {
  db.prepare('UPDATE npc SET estado = ? WHERE id = ?').run(estado, npcId);
  return obtenerNpc(db, npcId);
}
