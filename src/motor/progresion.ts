const MAX_ATRIBUTO = 16;

export interface StatsPersonaje {
  fuerza: number;
  astucia: number;
  corazon: number;
  hpMax: number;
}

export type EleccionProgresion =
  | { tipo: 'atributo'; atributo: 'fuerza' | 'astucia' | 'corazon' }
  | { tipo: 'hp_max' }
  | { tipo: 'objeto' };

/**
 * Al cerrar capítulo cada jugador elige UNA mejora. Es un formulario
 * validado en código: si el modelo lo decidiera en prosa, regalaría
 * bonificaciones de forma inconsistente.
 */
export function aplicarProgresion(
  stats: StatsPersonaje,
  eleccion: EleccionProgresion,
): StatsPersonaje {
  if (eleccion.tipo === 'atributo') {
    const valorActual = stats[eleccion.atributo];
    if (valorActual >= MAX_ATRIBUTO) {
      throw new Error(`${eleccion.atributo} ya está en el tope (${MAX_ATRIBUTO})`);
    }
    return { ...stats, [eleccion.atributo]: valorActual + 1 };
  }

  if (eleccion.tipo === 'hp_max') {
    return { ...stats, hpMax: stats.hpMax + 1 };
  }

  // 'objeto': no modifica stats, se resuelve dando un item vía dar_item().
  return { ...stats };
}
