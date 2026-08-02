import type Database from 'better-sqlite3';
import * as repo from '../db/repo.js';
import { estadoRitmo } from '../motor/fase.js';
import { parseNumeroHablado } from '../motor/numeros.js';
import { TOOLS, ejecutarTool, FLAG_TIRADA_PENDIENTE, type ContextoTurno } from './tools.js';
import type { LLMProvider, Mensaje } from './provider.js';

const SYSTEM_PROMPT = `Sos el narrador de un juego de rol presencial para dos jugadores: un adulto y
un niño de 8 años. Te escuchan en voz alta. No leen nada.

NARRACIÓN
- Máximo 120 palabras por turno. Frases cortas. Vocabulario simple.
- Escribís para ser escuchado: sin listas, sin viñetas, sin markdown, sin
  paréntesis. Prosa hablada.
- Terminá SIEMPRE preguntando qué hace el jugador de turno, y ofrecé 3
  opciones concretas como ejemplo, aclarando que pueden hacer otra cosa.
- Nunca dos turnos seguidos del mismo jugador. Respetá turno_actual: si le
  vas a hablar a un jugador distinto del que dice el estado, llamá SIEMPRE a
  pasar_turno() primero, en la misma respuesta, antes de escribir la
  narración dirigida a esa persona.
- Si el niño propone algo imposible, no digas "no": pedile una tirada difícil
  o mostrale qué necesitaría para lograrlo.

TRANSCRIPCIÓN DE VOZ
- Antes de resolver cualquier acción, reformulá en una frase corta lo que el
  jugador dijo que hace.
- Si la transcripción no tiene sentido en el contexto, interpretá la opción
  más plausible y reformulala igual.
- NUNCA digas que no entendiste ni pidas que repitan.

MECÁNICA (no negociable)
- Nunca decidas si una tirada tuvo éxito. Llamá a pedir_tirada() y esperá
  resolver_tirada().
- Nunca menciones HP, daño o inventario sin haber llamado a la tool.
- Nunca contradigas el estado que recibís. Si un NPC está 'derrotado', no aparece.
- CRÍTICO: en este juego hay que sacar IGUAL O MENOS que el atributo para
  tener éxito (es al revés de lo esperable). Cuando pidas una tirada, usá
  SIEMPRE la frase exacta que te devuelve pedir_tirada() (algo como "necesita
  sacar 12 o menos"). NUNCA digas "o más", "mayor a", "superá" ni ninguna
  variante que implique sacar alto — es información incorrecta que confunde
  a los jugadores sobre cómo se juega.

RITMO
- El bloque ESTADO DE RITMO es autoridad absoluta. Seguí la directiva de la
  fase aunque tengas otra idea mejor.
- Nunca menciones "capítulo", "fase", "escena" ni cuántas faltan. Ellos ven
  una historia, no una estructura.

CONTINUIDAD
- El hilo semilla del capítulo es obligatorio: la aventura arranca de ahí.
- Cuando una decisión vaya a tener consecuencias más adelante, llamá a
  registrar_hilo().
- Diálogo de NPC: [voz:ID] texto [/voz].

CONTENIDO
- Sin muerte de personajes jugadores. Sin sangre. Sin crueldad hacia animales
  o niños.
- Los villanos son ridículos, torpes o tristes — nunca aterradores de verdad.
- Tono: aventura luminosa. Miedo momentáneo sí; angustia no.`;

function serializarEstado(db: Database.Database, campaniaId: string, capituloId: string): string {
  const personajes = repo.personajesDeCampania(db, campaniaId);
  const npcs = repo.npcsVivosDeCampania(db, campaniaId);
  const flags = repo.obtenerFlags(db, campaniaId);
  const capitulo = repo.obtenerCapitulo(db, capituloId);

  const lineasPersonajes = personajes
    .map((p) => {
      const items = repo.itemsDePersonaje(db, p.id).map((i) => i.nombre);
      return `- ${p.nombre} (${p.id}) [${p.jugador}] HP ${p.hp}/${p.hp_max}, Fuerza ${p.fuerza}, Astucia ${p.astucia}, Corazón ${p.corazon}${items.length ? `, inventario: ${items.join(', ')}` : ''}`;
    })
    .join('\n');

  const lineasNpcs = npcs
    .map((n) => `- ${n.nombre} (${n.id}) estado: ${n.estado}${n.hp !== null ? `, HP ${n.hp}` : ''}`)
    .join('\n');

  const flagsRelevantes = Object.entries(flags).filter(([clave]) => !clave.startsWith('_'));
  const lineasFlags = flagsRelevantes.map(([clave, valor]) => `- ${clave}: ${valor}`).join('\n');

  const objetivoPendiente = flags[FLAG_TIRADA_PENDIENTE];

  return [
    'ESTADO ACTUAL',
    `Turno de: ${capitulo.turno_actual ?? '(sin definir)'}`,
    'Personajes:',
    lineasPersonajes || '(ninguno)',
    'NPCs presentes:',
    lineasNpcs || '(ninguno)',
    flagsRelevantes.length ? `Flags:\n${lineasFlags}` : '',
    objetivoPendiente
      ? `TIRADA PENDIENTE: hay un chequeo esperando resultado, objetivo ${objetivoPendiente} (igual o menos = éxito). Si el jugador te dice un número, resolvelo — no vuelvas a pedir la tirada.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function bloqueRitmo(db: Database.Database, capituloId: string): string {
  const capitulo = repo.obtenerCapitulo(db, capituloId);
  const ritmo = estadoRitmo(capitulo.escena_actual, capitulo.escenas_total);
  return [
    'ESTADO DE RITMO',
    `Escena ${ritmo.escena} de ${ritmo.total}. Fase: ${ritmo.fase}.`,
    `Directiva: ${ritmo.directiva}`,
    `Escenas restantes: ${ritmo.escenasRestantes}.`,
  ].join('\n');
}

function construirContexto(
  db: Database.Database,
  campaniaId: string,
  capituloId: string,
  notaExtra?: string,
): Mensaje[] {
  const campania = repo.obtenerCampania(db, campaniaId);
  const capitulo = repo.obtenerCapitulo(db, capituloId);

  const sistema = [
    SYSTEM_PROMPT,
    campania.cronica ? `CRÓNICA DE LA CAMPAÑA\n${campania.cronica}` : '',
    capitulo.resumen ? `RESUMEN DEL CAPÍTULO\n${capitulo.resumen}` : '',
    serializarEstado(db, campaniaId, capituloId),
    bloqueRitmo(db, capituloId),
    notaExtra ?? '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const mensajes: Mensaje[] = [{ role: 'system', content: sistema }];

  const turnos = repo.ultimosTurnos(db, capituloId, 6);
  for (const turno of turnos) {
    mensajes.push({ role: turno.autor === 'dm' ? 'assistant' : 'user', content: turno.texto });
  }

  return mensajes;
}

export interface ResultadoTurno {
  narracion: string;
  toolsEjecutadas: { nombre: string; args: unknown; resultado: unknown }[];
  proveedor: string;
  tokensIn: number;
  tokensOut: number;
}

const MAX_ITERACIONES_TOOLS = 6;

/**
 * Corre un turno completo: arma el contexto, llama al LLM, ejecuta las
 * tool calls que pida contra la DB/motor, y repite hasta que el modelo
 * devuelva narración sin más tools pendientes.
 */
export async function correrTurno(
  provider: LLMProvider,
  ctx: ContextoTurno,
  texto: string,
  autor: string,
): Promise<ResultadoTurno> {
  const { db, campaniaId, capituloId } = ctx;

  repo.registrarTurno(db, { capituloId, autor, texto });

  const toolsEjecutadas: ResultadoTurno['toolsEjecutadas'] = [];
  let notaAutoResolucion: string | undefined;

  // Resolver la tirada es la mecánica más frágil para dejarla en manos del
  // tool-calling del modelo (visto en pruebas reales: a veces no llama a
  // resolver_tirada y se queda repreguntando). Si hay una tirada pendiente
  // y el jugador dijo un número, el código la resuelve acá directamente —
  // "el código resuelve" también aplica al parseo del número, no solo al
  // veredicto.
  const flagsPrevios = repo.obtenerFlags(db, campaniaId);
  if (flagsPrevios[FLAG_TIRADA_PENDIENTE]) {
    const valor = parseNumeroHablado(texto);
    if (valor !== null) {
      const resultado = ejecutarTool(ctx, 'resolver_tirada', { valor }) as {
        exito: boolean;
        objetivo: number;
      };
      toolsEjecutadas.push({ nombre: 'resolver_tirada', args: { valor }, resultado });
      notaAutoResolucion = [
        'TIRADA YA RESUELTA POR EL CÓDIGO (no la vuelvas a pedir, no ignores este resultado):',
        `el jugador dijo "${texto}", se interpretó como ${valor} contra objetivo ${resultado.objetivo}`,
        `→ ${resultado.exito ? 'ÉXITO' : 'FRACASO'}.`,
        'Narrá la consecuencia de este resultado ahora mismo, no llames a pedir_tirada ni resolver_tirada de nuevo.',
      ].join(' ');
    }
  }

  const mensajes = construirContexto(db, campaniaId, capituloId, notaAutoResolucion);
  let tokensIn = 0;
  let tokensOut = 0;

  for (let i = 0; i < MAX_ITERACIONES_TOOLS; i++) {
    const { mensaje, tokensIn: ti, tokensOut: to } = await provider.completar({ mensajes, tools: TOOLS });
    tokensIn += ti ?? 0;
    tokensOut += to ?? 0;
    mensajes.push(mensaje);

    if (!mensaje.tool_calls || mensaje.tool_calls.length === 0) {
      const narracion = mensaje.content ?? '';
      repo.registrarTurno(db, {
        capituloId,
        autor: 'dm',
        texto: narracion,
        proveedor: provider.nombre,
        tokensIn,
        tokensOut,
      });
      return { narracion, toolsEjecutadas, proveedor: provider.nombre, tokensIn, tokensOut };
    }

    for (const toolCall of mensaje.tool_calls) {
      let resultado: unknown;
      try {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        resultado = ejecutarTool(ctx, toolCall.function.name, args);
      } catch (err) {
        resultado = { error: err instanceof Error ? err.message : String(err) };
      }
      toolsEjecutadas.push({ nombre: toolCall.function.name, args: toolCall.function.arguments, resultado });
      mensajes.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(resultado),
      });
    }
  }

  throw new Error(`el modelo no cerró el turno después de ${MAX_ITERACIONES_TOOLS} llamadas a tools`);
}
