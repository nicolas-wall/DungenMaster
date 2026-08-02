export type Atributo = 'fuerza' | 'astucia' | 'corazon';

/**
 * 1d20 físico: igual o menor al atributo es éxito. Contraintuitivo mecánica de Cairn.
 */
export function resolverTirada(valor: number, objetivo: number): boolean {
  if (!Number.isInteger(valor) || valor < 1 || valor > 20) {
    throw new Error(`valor de tirada fuera de rango: ${valor}`);
  }
  return valor <= objetivo;
}

/** Ventaja: se tiran 2d20 físicos y se toma el menor. */
export function elegirValorVentaja(valores: readonly [number, number]): number {
  return Math.min(...valores);
}

/** Desventaja: se tiran 2d20 físicos y se toma el mayor. */
export function elegirValorDesventaja(valores: readonly [number, number]): number {
  return Math.max(...valores);
}
