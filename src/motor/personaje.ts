export interface AtributosCreacion {
  fuerza: number;
  astucia: number;
  corazon: number;
}

const PUNTOS_TOTALES = 30;
const MIN_CREACION = 8;
const MAX_CREACION = 14;

/**
 * Reparto de 30 puntos entre 3 atributos, 8-14 cada uno al crear personaje.
 * Devuelve la lista de errores; vacía significa que el reparto es válido.
 */
export function validarAtributosCreacion(atributos: AtributosCreacion): string[] {
  const errores: string[] = [];
  const { fuerza, astucia, corazon } = atributos;

  for (const [nombre, valor] of Object.entries({ fuerza, astucia, corazon })) {
    if (!Number.isInteger(valor) || valor < MIN_CREACION || valor > MAX_CREACION) {
      errores.push(`${nombre} debe estar entre ${MIN_CREACION} y ${MAX_CREACION}, recibido ${valor}`);
    }
  }

  const suma = fuerza + astucia + corazon;
  if (suma !== PUNTOS_TOTALES) {
    errores.push(`la suma de atributos debe ser ${PUNTOS_TOTALES}, recibido ${suma}`);
  }

  return errores;
}

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 20;

/** Nombre de personaje: 2-20 caracteres (CLAUDE.md sección 6). */
export function validarNombrePersonaje(nombre: string): string[] {
  const limpio = nombre.trim();
  if (limpio.length < NOMBRE_MIN || limpio.length > NOMBRE_MAX) {
    return [`el nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres, recibido ${limpio.length}`];
  }
  return [];
}

const CARA_A_ATRIBUTO: Record<number, keyof AtributosCreacion> = {
  1: 'fuerza',
  2: 'fuerza',
  3: 'astucia',
  4: 'astucia',
  5: 'corazon',
  6: 'corazon',
};

/**
 * Reparto de atributos tirando un d6 físico 6 veces: se arranca en
 * 8/8/8 (24 puntos) y cada tirada suma 1 punto al atributo de su cara
 * (1-2 fuerza, 3-4 astucia, 5-6 corazón), hasta completar los 30. Como
 * cada atributo puede recibir como máximo las 6 tiradas, el resultado
 * siempre cae en el rango válido 8-14 sin necesidad de recortar nada.
 */
export function atributosPorDados(tiradas: readonly number[]): AtributosCreacion {
  if (tiradas.length !== 6) {
    throw new Error(`hacen falta exactamente 6 tiradas de d6, recibí ${tiradas.length}`);
  }

  const atributos: AtributosCreacion = { fuerza: MIN_CREACION, astucia: MIN_CREACION, corazon: MIN_CREACION };

  for (const cara of tiradas) {
    if (!Number.isInteger(cara) || cara < 1 || cara > 6) {
      throw new Error(`tirada de d6 inválida: ${cara}`);
    }
    atributos[CARA_A_ATRIBUTO[cara]]++;
  }

  return atributos;
}
