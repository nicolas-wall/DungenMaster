import type Database from 'better-sqlite3';
import type { ToolSchema } from './provider.js';
import * as repo from '../db/repo.js';
import { resolverTirada } from '../motor/tirada.js';
import { faseDeEscena } from '../motor/fase.js';
import { puedeRegistrarHilo, puedeCerrarCapitulo } from '../motor/hilos.js';
import { tirarTabla, type NombreTabla } from '../motor/tablas.js';
import { asignarVozNpc } from '../voz/voces.js';

export interface ContextoTurno {
  db: Database.Database;
  campaniaId: string;
  capituloId: string;
}

const ATRIBUTOS = ['fuerza', 'astucia', 'corazon'] as const;
type Atributo = (typeof ATRIBUTOS)[number];

export const FLAG_TIRADA_PENDIENTE = '_tirada_pendiente_objetivo';

/**
 * Todas las tools de la sección 5 de CLAUDE.md. El modelo nunca decide
 * éxito/fracaso, HP ni ritmo — solo puede pedir estas funciones, y el
 * código resuelve.
 */
export const TOOLS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'marcar_fin_de_escena',
      description: 'Marca que la escena actual terminó narrativamente.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mover_escena',
      description: 'Avanza el contador de escena del capítulo. Solo el servidor decide cuándo llamar a esto.',
      parameters: {
        type: 'object',
        properties: { nueva_escena: { type: 'integer', minimum: 1 } },
        required: ['nueva_escena'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pasar_turno',
      description: 'Cambia de quién es el turno de hablar. Nunca dos turnos seguidos del mismo jugador.',
      parameters: {
        type: 'object',
        properties: { personaje_id: { type: 'string' } },
        required: ['personaje_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pedir_tirada',
      description:
        'Pide al jugador que tire un d20 físico. Devuelve el objetivo (para mostrar en pantalla) y un texto para leer en voz alta.',
      parameters: {
        type: 'object',
        properties: {
          personaje_id: { type: 'string' },
          atributo: { type: 'string', enum: ATRIBUTOS },
          ventaja: { type: 'boolean', description: 'true=ventaja, false u omitido=normal' },
          desventaja: { type: 'boolean' },
        },
        required: ['personaje_id', 'atributo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resolver_tirada',
      description:
        'Resuelve la tirada pendiente con el valor que el jugador leyó del dado físico. El código decide éxito/fracaso, nunca el modelo.',
      parameters: {
        type: 'object',
        properties: { valor: { type: 'integer', minimum: 1, maximum: 20 } },
        required: ['valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aplicar_dano',
      description: 'Aplica daño a un personaje o NPC. A 0 HP queda Fuera de Combate, nunca "muerto".',
      parameters: {
        type: 'object',
        properties: {
          objetivo_id: { type: 'string' },
          cantidad: { type: 'integer', minimum: 0 },
          fuente: { type: 'string' },
        },
        required: ['objetivo_id', 'cantidad', 'fuente'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'curar',
      description: 'Cura HP a un personaje, sin superar su HP máximo.',
      parameters: {
        type: 'object',
        properties: { objetivo_id: { type: 'string' }, cantidad: { type: 'integer', minimum: 0 } },
        required: ['objetivo_id', 'cantidad'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dar_item',
      description: 'Le da un objeto a un personaje.',
      parameters: {
        type: 'object',
        properties: {
          personaje_id: { type: 'string' },
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          usos: { type: 'integer', minimum: 1 },
        },
        required: ['personaje_id', 'nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gastar_item',
      description: 'Gasta un uso de un objeto. Si se queda sin usos, desaparece del inventario.',
      parameters: { type: 'object', properties: { item_id: { type: 'string' } }, required: ['item_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_npc',
      description: 'Crea un NPC nuevo en el mundo.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          hp: { type: 'integer', minimum: 1 },
          voz_id: { type: 'string' },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_npc',
      description: 'Cambia el estado o HP de un NPC existente (vivo, huido, derrotado, aliado).',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string' },
          estado: { type: 'string', enum: ['vivo', 'huido', 'derrotado', 'aliado'] },
          hp: { type: 'integer', minimum: 0 },
        },
        required: ['npc_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_flag',
      description: 'Guarda un dato persistente del mundo (una puerta abierta, una promesa hecha, etc.).',
      parameters: {
        type: 'object',
        properties: { clave: { type: 'string' }, valor: { type: 'string' } },
        required: ['clave', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tirar_tabla',
      description: 'Tira una tabla de contenido aleatorio.',
      parameters: {
        type: 'object',
        properties: { tabla: { type: 'string', enum: ['complicacion', 'tesoro', 'nombre_npc', 'monstruo'] } },
        required: ['tabla'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_hilo',
      description:
        'Registra una trama pendiente para capítulos futuros. Solo funciona en fase "desarrollo" y hasta 3 hilos por capítulo.',
      parameters: {
        type: 'object',
        properties: { descripcion: { type: 'string' }, personaje_id: { type: 'string' } },
        required: ['descripcion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cerrar_hilo',
      description: 'Cierra un hilo narrativo que ya se resolvió.',
      parameters: { type: 'object', properties: { hilo_id: { type: 'string' } }, required: ['hilo_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cerrar_capitulo',
      description: 'Cierra el capítulo actual. Solo funciona en fase "cierre".',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          que_cambio_en_el_mundo: { type: 'string' },
          hilo_nuevo: { type: 'string' },
        },
        required: ['titulo', 'que_cambio_en_el_mundo'],
      },
    },
  },
];

function faseActual(db: Database.Database, capituloId: string) {
  const capitulo = repo.obtenerCapitulo(db, capituloId);
  return { capitulo, fase: faseDeEscena(capitulo.escena_actual, capitulo.escenas_total) };
}

export function ejecutarTool(
  ctx: ContextoTurno,
  nombre: string,
  args: Record<string, unknown>,
): unknown {
  const { db, campaniaId, capituloId } = ctx;

  switch (nombre) {
    case 'marcar_fin_de_escena':
      return { ok: true };

    case 'mover_escena': {
      const capitulo = repo.moverEscena(db, capituloId, args.nueva_escena as number);
      return { escena_actual: capitulo.escena_actual, fase: faseDeEscena(capitulo.escena_actual, capitulo.escenas_total) };
    }

    case 'pasar_turno': {
      const capitulo = repo.pasarTurno(db, capituloId, args.personaje_id as string);
      return { turno_actual: capitulo.turno_actual };
    }

    case 'pedir_tirada': {
      const personaje = repo.obtenerPersonaje(db, args.personaje_id as string);
      const atributo = args.atributo as Atributo;
      const objetivo = personaje[atributo];
      repo.setFlag(db, campaniaId, FLAG_TIRADA_PENDIENTE, String(objetivo));
      return {
        objetivo,
        texto: `${personaje.nombre} necesita sacar ${objetivo} o menos en el dado de veinte caras.`,
      };
    }

    case 'resolver_tirada': {
      const flags = repo.obtenerFlags(db, campaniaId);
      const objetivoGuardado = flags[FLAG_TIRADA_PENDIENTE];
      if (objetivoGuardado === undefined) {
        throw new Error('no hay ninguna tirada pendiente: llamá a pedir_tirada primero');
      }
      const objetivo = Number.parseInt(objetivoGuardado, 10);
      const valor = args.valor as number;
      const exito = resolverTirada(valor, objetivo);
      repo.setFlag(db, campaniaId, FLAG_TIRADA_PENDIENTE, ''); // limpia la tirada pendiente
      return { exito, objetivo };
    }

    case 'aplicar_dano': {
      const objetivoId = args.objetivo_id as string;
      const cantidad = args.cantidad as number;
      // primero se intenta como personaje; si no existe, como NPC.
      try {
        return repo.aplicarDanoPersonaje(db, objetivoId, cantidad);
      } catch {
        return repo.aplicarDanoNpc(db, objetivoId, cantidad);
      }
    }

    case 'curar': {
      const hpNuevo = repo.curarPersonaje(db, args.objetivo_id as string, args.cantidad as number);
      return { hp_nuevo: hpNuevo };
    }

    case 'dar_item':
      return repo.darItem(db, {
        personajeId: args.personaje_id as string,
        nombre: args.nombre as string,
        descripcion: args.descripcion as string | undefined,
        usos: args.usos as number | undefined,
      });

    case 'gastar_item':
      return repo.gastarItem(db, args.item_id as string);

    case 'registrar_npc': {
      const nombre = args.nombre as string;
      return repo.crearNpc(db, {
        campaniaId,
        nombre,
        descripcion: args.descripcion as string | undefined,
        hp: args.hp as number | undefined,
        vozId: (args.voz_id as string | undefined) ?? asignarVozNpc(nombre),
      });
    }

    case 'actualizar_npc':
      return repo.actualizarNpc(db, args.npc_id as string, {
        estado: args.estado as repo.Npc['estado'] | undefined,
        hp: args.hp as number | undefined,
      });

    case 'set_flag':
      repo.setFlag(db, campaniaId, args.clave as string, args.valor as string);
      return { ok: true };

    case 'tirar_tabla':
      return tirarTabla(args.tabla as NombreTabla);

    case 'registrar_hilo': {
      const { capitulo, fase } = faseActual(db, capituloId);
      const abiertos = repo.hilosAbiertosDeCapitulo(db, campaniaId, capitulo.numero);
      const errores = puedeRegistrarHilo(fase, abiertos.length);
      if (errores.length > 0) throw new Error(errores.join('; '));
      return repo.crearHilo(db, {
        campaniaId,
        descripcion: args.descripcion as string,
        origen: 'jugador',
        personajeId: args.personaje_id as string | undefined,
        creadoCap: capitulo.numero,
      });
    }

    case 'cerrar_hilo':
      repo.cerrarHilo(db, args.hilo_id as string);
      return { ok: true };

    case 'cerrar_capitulo': {
      const { fase } = faseActual(db, capituloId);
      const errores = puedeCerrarCapitulo(fase);
      if (errores.length > 0) throw new Error(errores.join('; '));
      const capituloCerrado = repo.cerrarCapituloDb(db, capituloId, { titulo: args.titulo as string });
      repo.incrementarCapitulosJugadosDeCampania(db, campaniaId);
      if (args.hilo_nuevo) {
        repo.crearHilo(db, {
          campaniaId,
          descripcion: args.hilo_nuevo as string,
          origen: 'dm',
          creadoCap: capituloCerrado.numero,
        });
      }
      return { estado: capituloCerrado.estado, que_cambio_en_el_mundo: args.que_cambio_en_el_mundo };
    }

    default:
      throw new Error(`tool desconocida: ${nombre}`);
  }
}
