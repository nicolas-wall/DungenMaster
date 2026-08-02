import type { Fase } from './fase.js';

const MAX_HILOS_POR_CAPITULO = 3;

/**
 * Guard duro: registrar_hilo() solo funciona en fase 'desarrollo' y hasta
 * 3 hilos abiertos por capítulo. Si esto vive en el prompt, se ignora
 * alrededor de la escena 10 — el bloqueo tiene que ser código.
 */
export function puedeRegistrarHilo(fase: Fase, hilosAbiertosEnCapitulo: number): string[] {
  const errores: string[] = [];
  if (fase !== 'desarrollo') {
    errores.push(`no se puede registrar un hilo en fase '${fase}', solo en 'desarrollo'`);
  }
  if (hilosAbiertosEnCapitulo >= MAX_HILOS_POR_CAPITULO) {
    errores.push(`ya hay ${hilosAbiertosEnCapitulo} hilos abiertos, el máximo es ${MAX_HILOS_POR_CAPITULO}`);
  }
  return errores;
}

export function puedeCerrarCapitulo(fase: Fase): string[] {
  return fase === 'cierre' ? [] : [`no se puede cerrar el capítulo en fase '${fase}', solo en 'cierre'`];
}

export interface HiloCandidato {
  id: string;
  origen: 'jugador' | 'dm';
  creadoCap: number;
}

/**
 * El código elige el hilo semilla al abrir capítulo, no el modelo:
 * prioridad a hilos de origen jugador, más antiguos primero.
 */
export function elegirHiloSemilla(hilos: readonly HiloCandidato[]): HiloCandidato | null {
  if (hilos.length === 0) return null;

  const ordenados = [...hilos].sort((a, b) => {
    if (a.origen !== b.origen) return a.origen === 'jugador' ? -1 : 1;
    return a.creadoCap - b.creadoCap;
  });

  return ordenados[0];
}
