import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { abrirDb } from '../db/client.js';
import * as repo from '../db/repo.js';
import { correrTurno, generarRecap } from './loop.js';
import type { LLMProvider, Mensaje, ResultadoCompletar, ToolSchema } from './provider.js';

/**
 * Doble de prueba del LLM: implementa el mismo contrato que un proveedor
 * real (OpenAICompatProvider), pero devuelve una secuencia de respuestas
 * prearmada en vez de llamar a una API. Sirve para probar que correrTurno()
 * ejecuta las tools contra la DB correctamente sin depender de una key real.
 */
class LLMFalso implements LLMProvider {
  readonly nombre = 'falso';
  private respuestas: Mensaje[];
  private indice = 0;
  llamadas: { mensajes: Mensaje[]; tools?: ToolSchema[] }[] = [];

  constructor(respuestas: Mensaje[]) {
    this.respuestas = respuestas;
  }

  async completar(args: { mensajes: Mensaje[]; tools?: ToolSchema[] }): Promise<ResultadoCompletar> {
    this.llamadas.push(args);
    const mensaje = this.respuestas[this.indice];
    if (!mensaje) throw new Error('el LLMFalso se quedó sin respuestas preparadas');
    this.indice++;
    return { mensaje, tokensIn: 10, tokensOut: 10 };
  }

  async *completarStream(): AsyncGenerator<string> {
    throw new Error('no usado en este test');
  }
}

function toolCallMsg(nombre: string, args: Record<string, unknown>): Mensaje {
  return {
    role: 'assistant',
    content: '',
    tool_calls: [{ id: `call_${nombre}`, type: 'function', function: { name: nombre, arguments: JSON.stringify(args) } }],
  };
}

describe('correrTurno', () => {
  let db: Database.Database;
  let campaniaId: string;
  let capituloId: string;
  let brunoId: string;

  beforeEach(() => {
    db = abrirDb(':memory:');
    const campania = repo.crearCampania(db, 'Test');
    campaniaId = campania.id;
    const capitulo = repo.crearCapitulo(db, { campaniaId, numero: 1, escenasTotal: 8 });
    capituloId = capitulo.id;
    const bruno = repo.crearPersonaje(db, {
      jugador: 'hijo',
      nombre: 'Bruno',
      arquetipo: 'guardian',
      fuerza: 12,
      astucia: 10,
      corazon: 8,
    });
    repo.vincularPersonajeACampania(db, campaniaId, bruno.id);
    brunoId = bruno.id;
  });

  it('ejecuta una secuencia de tools (tirada + daño) y termina con narración', async () => {
    const provider = new LLMFalso([
      toolCallMsg('pedir_tirada', { personaje_id: brunoId, atributo: 'fuerza' }),
      toolCallMsg('aplicar_dano', { objetivo_id: brunoId, cantidad: 3, fuente: 'trampa' }),
      { role: 'assistant', content: 'Bruno esquiva casi todo, pero el golpe le duele. ¿Qué hace ahora?' },
    ]);

    const resultado = await correrTurno(provider, { db, campaniaId, capituloId }, 'Intento cruzar el puente', brunoId);

    expect(resultado.narracion).toContain('Bruno esquiva');
    expect(resultado.toolsEjecutadas.map((t) => t.nombre)).toEqual(['pedir_tirada', 'aplicar_dano']);

    const bruno = repo.obtenerPersonaje(db, brunoId);
    expect(bruno.hp).toBe(3); // 6 - 3

    const turnos = repo.ultimosTurnos(db, capituloId, 10);
    expect(turnos.map((t) => t.autor)).toEqual([brunoId, 'dm']);
    expect(turnos[1].texto).toContain('Bruno esquiva');
  });

  it('resolver_tirada usa el objetivo que dejó pedir_tirada, no lo inventa el modelo', async () => {
    const provider = new LLMFalso([
      toolCallMsg('pedir_tirada', { personaje_id: brunoId, atributo: 'fuerza' }), // objetivo = 12
      toolCallMsg('resolver_tirada', { valor: 15 }), // 15 > 12 -> fracaso
      { role: 'assistant', content: 'El golpe no llega a tiempo.' },
    ]);

    await correrTurno(provider, { db, campaniaId, capituloId }, 'Trato de empujar la roca', brunoId);

    // el resultado de la tirada solo se puede ver a través del tool result que
    // el loop le pasa de vuelta al modelo; lo validamos indirectamente
    // verificando que no explotó y que la flag interna quedó limpia.
    const flags = repo.obtenerFlags(db, campaniaId);
    expect(flags['_tirada_pendiente_objetivo']).toBe('');
  });

  it('resuelve la tirada por código en el turno siguiente aunque el modelo no llame a resolver_tirada', async () => {
    // Reproduce el bug reportado: el jugador dice el número del dado en un
    // turno nuevo (después de que pedir_tirada ya corrió en el turno
    // anterior) y el modelo, esta vez, no llama a ninguna tool — solo
    // vuelve a preguntar. El código tiene que resolver igual.
    const providerTurno1 = new LLMFalso([
      toolCallMsg('pedir_tirada', { personaje_id: brunoId, atributo: 'fuerza' }), // objetivo = 12
      { role: 'assistant', content: '¿Tirás el dado de Fuerza?' },
    ]);
    await correrTurno(providerTurno1, { db, campaniaId, capituloId }, 'Intento mover la piedra', brunoId);

    expect(repo.obtenerFlags(db, campaniaId)['_tirada_pendiente_objetivo']).toBe('12');

    // El modelo del segundo turno "se olvida" de llamar a resolver_tirada.
    const providerTurno2 = new LLMFalso([
      { role: 'assistant', content: '¿Qué sacaste en el dado?' },
    ]);
    const resultado = await correrTurno(providerTurno2, { db, campaniaId, capituloId }, 'saqué un 8', brunoId);

    // A pesar de que el modelo no llamó a la tool, el código ya resolvió
    // la tirada antes de siquiera preguntarle al modelo.
    expect(resultado.toolsEjecutadas).toEqual([
      { nombre: 'resolver_tirada', args: { valor: 8 }, resultado: { exito: true, objetivo: 12 } },
    ]);
    expect(repo.obtenerFlags(db, campaniaId)['_tirada_pendiente_objetivo']).toBe('');
  });

  it('tira un error claro si el modelo nunca deja de pedir tools', async () => {
    const respuestasInfinitas = Array.from({ length: 10 }, () =>
      toolCallMsg('marcar_fin_de_escena', {}),
    );
    const provider = new LLMFalso(respuestasInfinitas);

    await expect(
      correrTurno(provider, { db, campaniaId, capituloId }, 'Sigo caminando', brunoId),
    ).rejects.toThrow(/no cerró el turno/);
  });

  it('registrar_hilo respeta el guard de fase incluso si el modelo insiste', async () => {
    // escena 1 de 8 = fase 'apertura', no 'desarrollo' -> debe rechazar el hilo.
    const provider = new LLMFalso([
      toolCallMsg('registrar_hilo', { descripcion: 'El duende promete volver' }),
      { role: 'assistant', content: 'Seguimos explorando.' },
    ]);

    const resultado = await correrTurno(provider, { db, campaniaId, capituloId }, 'Reviso la cueva', brunoId);
    const toolHilo = resultado.toolsEjecutadas[0];
    expect(toolHilo.resultado).toHaveProperty('error');
    expect(repo.hilosDeCampania(db, campaniaId)).toHaveLength(0);
  });

  it('cerrar_capitulo suma un capítulo jugado a cada personaje de la campaña', async () => {
    repo.moverEscena(db, capituloId, 8); // 8/8 = fase 'cierre'
    expect(repo.obtenerPersonaje(db, brunoId).capitulos_jugados).toBe(0);

    const provider = new LLMFalso([
      toolCallMsg('cerrar_capitulo', { titulo: 'El fin', que_cambio_en_el_mundo: 'Todo tranquilo' }),
      { role: 'assistant', content: 'Fin del capítulo.' },
    ]);
    await correrTurno(provider, { db, campaniaId, capituloId }, 'Cerramos acá', brunoId);

    expect(repo.obtenerPersonaje(db, brunoId).capitulos_jugados).toBe(1);
  });
});

describe('generarRecap', () => {
  let db: Database.Database;
  let campaniaId: string;
  let capituloId: string;

  beforeEach(() => {
    db = abrirDb(':memory:');
    const campania = repo.crearCampania(db, 'Test');
    campaniaId = campania.id;
    const capitulo = repo.crearCapitulo(db, { campaniaId, numero: 1, escenasTotal: 8 });
    capituloId = capitulo.id;
  });

  it('llama al modelo sin tools y registra el resultado como turno del dm', async () => {
    const provider = new LLMFalso([{ role: 'assistant', content: 'La última vez, Bruno encontró una llave dorada. ¿Qué hace ahora?' }]);

    const resultado = await generarRecap(provider, { db, campaniaId, capituloId });

    expect(resultado.narracion).toContain('La última vez');
    expect(provider.llamadas).toHaveLength(1);
    expect(provider.llamadas[0].tools).toBeUndefined();

    const turnos = repo.ultimosTurnos(db, capituloId, 10);
    expect(turnos).toHaveLength(1);
    expect(turnos[0].autor).toBe('dm');
    expect(turnos[0].texto).toContain('La última vez');
  });
});
