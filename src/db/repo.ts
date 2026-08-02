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

export function obtenerCampania(db: Database.Database, id: string): Campania {
  const fila = db.prepare('SELECT * FROM campania WHERE id = ?').get(id) as Campania | undefined;
  if (!fila) throw new Error(`campaña no encontrada: ${id}`);
  return fila;
}

export function campaniaMasReciente(db: Database.Database): Campania | null {
  return (
    (db.prepare('SELECT * FROM campania ORDER BY creada_en DESC LIMIT 1').get() as Campania | undefined) ?? null
  );
}

export function capituloEnCursoDeCampania(db: Database.Database, campaniaId: string): Capitulo | null {
  return (
    (db
      .prepare("SELECT * FROM capitulo WHERE campania_id = ? AND estado = 'en_curso' ORDER BY numero DESC LIMIT 1")
      .get(campaniaId) as Capitulo | undefined) ?? null
  );
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

export function actualizarNpc(
  db: Database.Database,
  npcId: string,
  cambios: { estado?: Npc['estado']; hp?: number },
): Npc {
  const npc = obtenerNpc(db, npcId);
  const estado = cambios.estado ?? npc.estado;
  const hp = cambios.hp ?? npc.hp;
  db.prepare('UPDATE npc SET estado = ?, hp = ? WHERE id = ?').run(estado, hp, npcId);
  return obtenerNpc(db, npcId);
}

export function personajesDeCampania(db: Database.Database, campaniaId: string): Personaje[] {
  return db.prepare('SELECT * FROM personaje WHERE campania_id = ?').all(campaniaId) as Personaje[];
}

export function npcsVivosDeCampania(db: Database.Database, campaniaId: string): Npc[] {
  return db
    .prepare("SELECT * FROM npc WHERE campania_id = ? AND estado != 'derrotado'")
    .all(campaniaId) as Npc[];
}

export function pasarTurno(db: Database.Database, capituloId: string, personajeId: string): Capitulo {
  db.prepare('UPDATE capitulo SET turno_actual = ? WHERE id = ?').run(personajeId, capituloId);
  return obtenerCapitulo(db, capituloId);
}

// --- Items ---

export interface Item {
  id: string;
  personaje_id: string;
  nombre: string;
  descripcion: string | null;
  usos: number | null;
}

export function darItem(
  db: Database.Database,
  datos: { personajeId: string; nombre: string; descripcion?: string; usos?: number },
): Item {
  const item: Item = {
    id: randomUUID(),
    personaje_id: datos.personajeId,
    nombre: datos.nombre,
    descripcion: datos.descripcion ?? null,
    usos: datos.usos ?? null,
  };
  db.prepare(
    'INSERT INTO item (id, personaje_id, nombre, descripcion, usos) VALUES (@id, @personaje_id, @nombre, @descripcion, @usos)',
  ).run(item);
  return item;
}

export function obtenerItem(db: Database.Database, id: string): Item {
  const fila = db.prepare('SELECT * FROM item WHERE id = ?').get(id) as Item | undefined;
  if (!fila) throw new Error(`item no encontrado: ${id}`);
  return fila;
}

/** Gasta un uso; si el item queda en 0 usos (o no tenía contador), se elimina. */
export function gastarItem(db: Database.Database, itemId: string): { eliminado: boolean; usosRestantes: number | null } {
  const item = obtenerItem(db, itemId);
  if (item.usos === null) {
    db.prepare('DELETE FROM item WHERE id = ?').run(itemId);
    return { eliminado: true, usosRestantes: null };
  }
  const usosRestantes = item.usos - 1;
  if (usosRestantes <= 0) {
    db.prepare('DELETE FROM item WHERE id = ?').run(itemId);
    return { eliminado: true, usosRestantes: 0 };
  }
  db.prepare('UPDATE item SET usos = ? WHERE id = ?').run(usosRestantes, itemId);
  return { eliminado: false, usosRestantes };
}

export function itemsDePersonaje(db: Database.Database, personajeId: string): Item[] {
  return db.prepare('SELECT * FROM item WHERE personaje_id = ?').all(personajeId) as Item[];
}

// --- Flags ---

export function setFlag(db: Database.Database, campaniaId: string, clave: string, valor: string): void {
  db.prepare(
    `INSERT INTO flag (campania_id, clave, valor) VALUES (?, ?, ?)
     ON CONFLICT (campania_id, clave) DO UPDATE SET valor = excluded.valor`,
  ).run(campaniaId, clave, valor);
}

export function obtenerFlags(db: Database.Database, campaniaId: string): Record<string, string> {
  const filas = db.prepare('SELECT clave, valor FROM flag WHERE campania_id = ?').all(campaniaId) as {
    clave: string;
    valor: string;
  }[];
  return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
}

// --- Hilos ---

export interface Hilo {
  id: string;
  campania_id: string;
  descripcion: string;
  origen: 'jugador' | 'dm';
  personaje_id: string | null;
  estado: 'abierto' | 'usado' | 'cerrado';
  creado_cap: number;
}

export function crearHilo(
  db: Database.Database,
  datos: { campaniaId: string; descripcion: string; origen: 'jugador' | 'dm'; personajeId?: string; creadoCap: number },
): Hilo {
  const hilo: Hilo = {
    id: randomUUID(),
    campania_id: datos.campaniaId,
    descripcion: datos.descripcion,
    origen: datos.origen,
    personaje_id: datos.personajeId ?? null,
    estado: 'abierto',
    creado_cap: datos.creadoCap,
  };
  db.prepare(
    `INSERT INTO hilo (id, campania_id, descripcion, origen, personaje_id, estado, creado_cap)
     VALUES (@id, @campania_id, @descripcion, @origen, @personaje_id, @estado, @creado_cap)`,
  ).run(hilo);
  return hilo;
}

export function hilosAbiertosDeCapitulo(db: Database.Database, campaniaId: string, numeroCapitulo: number): Hilo[] {
  return db
    .prepare("SELECT * FROM hilo WHERE campania_id = ? AND creado_cap = ? AND estado = 'abierto'")
    .all(campaniaId, numeroCapitulo) as Hilo[];
}

export function hilosDeCampania(db: Database.Database, campaniaId: string): Hilo[] {
  return db.prepare('SELECT * FROM hilo WHERE campania_id = ?').all(campaniaId) as Hilo[];
}

export function cerrarHilo(db: Database.Database, hiloId: string): void {
  db.prepare("UPDATE hilo SET estado = 'cerrado' WHERE id = ?").run(hiloId);
}

export function marcarHiloUsado(db: Database.Database, hiloId: string): void {
  db.prepare("UPDATE hilo SET estado = 'usado' WHERE id = ?").run(hiloId);
}

// --- Turnos ---

export interface Turno {
  id: number;
  capitulo_id: string;
  autor: string;
  texto: string;
  proveedor: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  creado_en: number;
}

export function registrarTurno(
  db: Database.Database,
  datos: {
    capituloId: string;
    autor: string;
    texto: string;
    proveedor?: string;
    tokensIn?: number;
    tokensOut?: number;
  },
): Turno {
  const info = db
    .prepare(
      `INSERT INTO turno (capitulo_id, autor, texto, proveedor, tokens_in, tokens_out, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      datos.capituloId,
      datos.autor,
      datos.texto,
      datos.proveedor ?? null,
      datos.tokensIn ?? null,
      datos.tokensOut ?? null,
      Date.now(),
    );
  return db.prepare('SELECT * FROM turno WHERE id = ?').get(info.lastInsertRowid) as Turno;
}

export function ultimosTurnos(db: Database.Database, capituloId: string, cantidad: number): Turno[] {
  return (
    db
      .prepare('SELECT * FROM turno WHERE capitulo_id = ? ORDER BY id DESC LIMIT ?')
      .all(capituloId, cantidad) as Turno[]
  ).reverse();
}

// --- Cierre de capítulo ---

export function cerrarCapituloDb(
  db: Database.Database,
  capituloId: string,
  datos: { titulo?: string },
): Capitulo {
  db.prepare("UPDATE capitulo SET estado = 'cerrado', cerrado_en = ?, titulo = COALESCE(?, titulo) WHERE id = ?").run(
    Date.now(),
    datos.titulo ?? null,
    capituloId,
  );
  return obtenerCapitulo(db, capituloId);
}

// --- Sesiones ---
// sesion = pausa física (cerrar la compu y volver otro día), sin
// significado narrativo. Sirve para saber cuándo generar el recap
// de "la última vez...".

export interface Sesion {
  id: string;
  capitulo_id: string;
  inicio: number;
  fin: number | null;
  escena_inicio: number;
  escena_fin: number | null;
}

export function sesionAbierta(db: Database.Database, capituloId: string): Sesion | null {
  return (
    (db
      .prepare('SELECT * FROM sesion WHERE capitulo_id = ? AND fin IS NULL ORDER BY inicio DESC LIMIT 1')
      .get(capituloId) as Sesion | undefined) ?? null
  );
}

export function abrirSesion(db: Database.Database, capituloId: string): Sesion {
  const capitulo = obtenerCapitulo(db, capituloId);
  const sesion: Sesion = {
    id: randomUUID(),
    capitulo_id: capituloId,
    inicio: Date.now(),
    fin: null,
    escena_inicio: capitulo.escena_actual,
    escena_fin: null,
  };
  db.prepare(
    'INSERT INTO sesion (id, capitulo_id, inicio, fin, escena_inicio, escena_fin) VALUES (@id, @capitulo_id, @inicio, @fin, @escena_inicio, @escena_fin)',
  ).run(sesion);
  return sesion;
}

export function cerrarSesion(db: Database.Database, sesionId: string): void {
  const capitulo = db
    .prepare('SELECT c.* FROM capitulo c JOIN sesion s ON s.capitulo_id = c.id WHERE s.id = ?')
    .get(sesionId) as Capitulo;
  db.prepare('UPDATE sesion SET fin = ?, escena_fin = ? WHERE id = ?').run(
    Date.now(),
    capitulo.escena_actual,
    sesionId,
  );
}

// --- Lobby / listado de partidas ---

export interface CampaniaResumen {
  id: string;
  titulo: string;
  creadaEn: number;
  capitulo: { id: string; numero: number; escenaActual: number; escenasTotal: number } | null;
  personajes: { id: string; nombre: string; arquetipo: string; hp: number; hpMax: number }[];
}

export function listarCampanias(db: Database.Database): CampaniaResumen[] {
  const campanias = db.prepare('SELECT * FROM campania ORDER BY creada_en DESC').all() as Campania[];

  return campanias.map((c) => {
    const capitulo = capituloEnCursoDeCampania(db, c.id);
    const personajes = personajesDeCampania(db, c.id).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      arquetipo: p.arquetipo,
      hp: p.hp,
      hpMax: p.hp_max,
    }));

    return {
      id: c.id,
      titulo: c.titulo,
      creadaEn: c.creada_en,
      capitulo: capitulo
        ? { id: capitulo.id, numero: capitulo.numero, escenaActual: capitulo.escena_actual, escenasTotal: capitulo.escenas_total }
        : null,
      personajes,
    };
  });
}

export interface PersonajeDetalle extends Personaje {
  items: Item[];
}

export interface CampaniaDetalle {
  campania: Campania;
  capitulo: Capitulo | null;
  personajes: PersonajeDetalle[];
}

export function detalleCampania(db: Database.Database, campaniaId: string): CampaniaDetalle {
  const campania = obtenerCampania(db, campaniaId);
  const capitulo = capituloEnCursoDeCampania(db, campaniaId);
  const personajes = personajesDeCampania(db, campaniaId).map((p) => ({
    ...p,
    items: itemsDePersonaje(db, p.id),
  }));

  return { campania, capitulo, personajes };
}
